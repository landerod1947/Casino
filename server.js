const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let salas = {};
const SALDO_INICIAL = 5000;

function generarCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = ''; for(let i=0;i<4;i++) res += chars.charAt(Math.floor(Math.random()*chars.length));
    return res;
}

function generarBaraja() {
    const p=['H','D','C','S'], v=['A','2','3','4','5','6','7','8','9','T','J','Q','K'];
    let m=[]; p.forEach(x=>v.forEach(y=>m.push({id:y+x, valor:y, volteada:true})));
    return m.sort(()=>Math.random()-0.5);
}

function calcularPuntosBJ(mano) {
    let pts=0, ases=0;
    mano.forEach(c=>{
        if(['T','J','Q','K'].includes(c.valor)) pts+=10;
        else if(c.valor==='A') { pts+=11; ases++; }
        else pts+=parseInt(c.valor);
    });
    while(pts>21 && ases>0) { pts-=10; ases--; }
    return pts;
}

io.on('connection', (socket) => {
    socket.on('crear_sala', (data) => {
        let cod = generarCodigo(); while(salas[cod]) cod=generarCodigo();
        salas[cod] = {
            config: { juego:'BLACKJACK', dealerMode:'IA', dealerId:'IA', estado:'ESPERANDO' },
            hostId: socket.id, jugadores: [], bjState: { fase:'APOSTANDO', turno:0, deck:[], manoDealer:[] }
        };
        socket.emit('sala_creada', cod);
        unirseJugador(socket, cod, data.nombreHost);
    });

    socket.on('unirse_sala', (d) => unirseJugador(socket, d.codigo.toUpperCase(), d.nombre));

    socket.on('actualizar_config', (d) => {
        const s = salas[d.codigo];
        if(s && s.hostId === socket.id) {
            Object.assign(s.config, d);
            io.to(d.codigo).emit('config_actualizada', s.config);
        }
    });

    socket.on('admin_accion', (data) => {
        const s = salas[data.codigo];
        if(!s || s.hostId !== socket.id) return;
        if(data.tipo === 'ADD_BOT') {
            const n = s.jugadores.filter(j=>j.esBot).length + 1;
            s.jugadores.push({ id:'BOT_'+Date.now(), nombre:`🤖 Bot ${n}`, esBot:true, saldo:SALDO_INICIAL, apuesta:0, mano:[] });
            io.to(data.codigo).emit('lista_espera', s.jugadores);
        } else if (data.tipo === 'KICK') {
            const idx = s.jugadores.findIndex(j => j.id === data.targetId);
            if(idx !== -1) { s.jugadores.splice(idx,1); io.to(data.codigo).emit('lista_espera', s.jugadores); }
        }
    });

    socket.on('iniciar_juego', (cod) => {
        const s = salas[cod]; if(!s) return;
        if(s.config.dealerMode === 'PLAYER' && s.config.dealerId === 'IA') s.config.dealerId = s.hostId;
        s.config.estado = 'JUGANDO';
        iniciarNuevaRonda(s, cod);
    });

    socket.on('bj_apostar', (d) => {
        const s=salas[d.codigo]; if(!s)return;
        const j=s.jugadores.find(p=>p.id===socket.id);
        if(j) {
            j.saldo-=d.monto; j.apuesta=d.monto; j.apuestaRealizada=true;
            const todos = s.jugadores.filter(p => p.id !== s.config.dealerId).every(p => p.apuestaRealizada);
            if(todos) repartirCartas(s, d.codigo); else emitirEstadoBJ(s, d.codigo);
        }
    });

    socket.on('bj_accion', (d) => manejarAccionBJ(socket, d));
    socket.on('enviar_mensaje', (d) => io.to(d.codigoSala).emit('mensaje_chat', d));
    socket.on('disconnect', () => abandonarSala(socket));
});

function iniciarNuevaRonda(s, cod) {
    s.bjState.fase = 'APOSTANDO';
    s.jugadores.forEach(j => {
        j.mano=[]; j.puntos=0; j.apuestaRealizada=false;
        if(j.saldo < 100) j.saldo = 100;
        if(j.esBot || j.id === s.config.dealerId) { j.apuestaRealizada=true; if(j.esBot){j.apuesta=100; j.saldo-=100;} }
    });
    io.to(cod).emit('juego_iniciado', { config: s.config });
    emitirEstadoBJ(s, cod);
}

function repartirCartas(s, cod) {
    s.bjState.fase='JUGANDO'; s.bjState.deck=generarBaraja(); s.bjState.turno=0;
    s.jugadores.forEach(j => { if(j.id !== s.config.dealerId) { j.mano=[s.bjState.deck.pop(), s.bjState.deck.pop()]; j.puntos=calcularPuntosBJ(j.mano); } });
    const v=s.bjState.deck.pop(); const o=s.bjState.deck.pop(); o.volteada=false;
    s.bjState.manoDealer=[v,o]; s.bjState.puntosDealer=calcularPuntosBJ([v]);
    avanzarTurnoBJ(s, cod, true);
}

function manejarAccionBJ(socket, d) {
    const s=salas[d.codigo]; if(!s) return;
    const j=s.jugadores[s.bjState.turno]; if(!j || j.id!==socket.id) return;
    if(d.accion==='PEDIR') {
        j.mano.push(s.bjState.deck.pop()); j.puntos=calcularPuntosBJ(j.mano);
        if(j.puntos>21) avanzarTurnoBJ(s, d.codigo); else emitirEstadoBJ(s, d.codigo);
    } else if(d.accion==='PLANTARSE') avanzarTurnoBJ(s, d.codigo);
}

function avanzarTurnoBJ(s, cod, inicio=false) {
    if(!inicio) s.bjState.turno++;
    while(s.bjState.turno < s.jugadores.length && s.jugadores[s.bjState.turno].id === s.config.dealerId) s.bjState.turno++;
    if(s.bjState.turno >= s.jugadores.length) finalizarRonda(s, cod);
    else {
        const j = s.jugadores[s.bjState.turno];
        if(j.esBot) { while(j.puntos < 17) j.mano.push(s.bjState.deck.pop()); j.puntos=calcularPuntosBJ(j.mano); avanzarTurnoBJ(s, cod); }
        else emitirEstadoBJ(s, cod);
    }
}

function finalizarRonda(s, cod) {
    s.bjState.manoDealer[1].volteada=true; s.bjState.puntosDealer=calcularPuntosBJ(s.bjState.manoDealer);
    while(s.bjState.puntosDealer < 17) s.bjState.manoDealer.push(s.bjState.deck.pop());
    s.bjState.puntosDealer=calcularPuntosBJ(s.bjState.manoDealer);
    const dp = s.bjState.puntosDealer;
    s.jugadores.forEach(j => {
        if(j.id === s.config.dealerId) return;
        if(j.puntos <= 21 && (dp > 21 || j.puntos > dp)) j.saldo += j.apuesta * 2;
        else if(j.puntos <= 21 && j.puntos === dp) j.saldo += j.apuesta;
    });
    emitirEstadoBJ(s, cod);
    setTimeout(() => { if(salas[cod]) iniciarNuevaRonda(s, cod); }, 4000);
}

function emitirEstadoBJ(s, cod) { io.to(cod).emit('bj_estado', { fase:s.bjState.fase, manoDealer:s.bjState.manoDealer, puntosDealer:s.bjState.puntosDealer, jugadores:s.jugadores, turnoActual:(s.bjState.turno<s.jugadores.length)?s.jugadores[s.bjState.turno].id:'DEALER', dealerId: s.config.dealerId }); }

function unirseJugador(socket, cod, nom) {
    const s=salas[cod]; if(!s) return;
    const n = { id:socket.id, nombre:nom, esHost:(s.hostId===socket.id), esBot:false, saldo:SALDO_INICIAL, apuesta:0, mano:[] };
    s.jugadores.push(n); socket.join(cod);
    socket.emit('entrado_sala', { codigo:cod, config:s.config, soyHost:n.esHost, jugadores:s.jugadores, miId:socket.id });
    io.to(cod).emit('lista_espera', s.jugadores);
}

function abandonarSala(socket) {
    for(let c in salas) {
        let s=salas[c]; let i=s.jugadores.findIndex(j=>j.id===socket.id);
        if(i!==-1) { s.jugadores.splice(i,1); io.to(c).emit('lista_espera', s.jugadores); break; }
    }
}

http.listen(3000, () => console.log('✅ Casino V15 Operativo'));