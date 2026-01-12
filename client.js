const socket = io();
window.clientSocket = socket; window.clientCodigo = null; window.clientNombre = "";
let soyHost = false; let miIdSocket = null; let listaCache = [];

const UI = {
    toast: (m) => { const d=document.createElement('div'); d.className='toast'; d.innerText=m; document.body.appendChild(d); setTimeout(()=>d.remove(),3000); },
    pantalla: (id) => { document.querySelectorAll('.pantalla').forEach(p=>p.classList.remove('activa')); document.getElementById(id).classList.add('activa'); },
    copiar: () => {
        navigator.clipboard.writeText(window.clientCodigo);
        UI.toast("¡Código copiado!");
    },
    toggleChat: () => document.getElementById('chat-flotante').classList.toggle('hidden'),
    updateLobby: (dm) => {
        const pSel = document.getElementById('player-dealer-select');
        if(dm === 'PLAYER') {
            pSel.classList.remove('hidden');
            pSel.innerHTML = listaCache.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
        } else pSel.classList.add('hidden');
    }
};

const App = {
    crearSala: () => { window.clientNombre = document.getElementById('input-nick').value; if(!window.clientNombre) return; socket.emit('crear_sala', {nombreHost: window.clientNombre}); },
    unirse: () => { window.clientNombre = document.getElementById('input-nick').value; const c = document.getElementById('codigo-input').value; if(!c) return; socket.emit('unirse_sala', {nombre: window.clientNombre, codigo: c}); },
    cambiarConfig: () => {
        if(!soyHost) return;
        const dm = document.getElementById('dealer-mode-select').value;
        const di = (dm==='PLAYER') ? document.getElementById('player-dealer-select').value : 'IA';
        UI.updateLobby(dm);
        socket.emit('actualizar_config', {codigo: window.clientCodigo, dealerMode: dm, dealerId: di});
    },
    iniciar: () => socket.emit('iniciar_juego', window.clientCodigo),
    addBot: () => socket.emit('admin_accion', {codigo: window.clientCodigo, tipo: 'ADD_BOT'}),
    kick: (id) => socket.emit('admin_accion', {codigo: window.clientCodigo, tipo: 'KICK', targetId: id}),
    salir: () => { socket.disconnect(); window.location.reload(); },
    irSol: () => { UI.pantalla('pantalla-solitario'); Klondike.iniciar(); Klondike.render(); }
};

socket.on('entrado_sala', (d) => {
    window.clientCodigo = d.codigo; soyHost = d.soyHost; miIdSocket = d.miId; listaCache = d.jugadores;
    UI.pantalla('pantalla-espera'); document.getElementById('display-codigo').innerText = d.codigo;
    if(soyHost) document.getElementById('host-controls').classList.remove('hidden');
    renderLista(d.jugadores);
});

socket.on('lista_espera', (l) => { listaCache = l; renderLista(l); if(soyHost) App.cambiarConfig(); });
socket.on('juego_iniciado', (d) => { UI.pantalla('pantalla-juego'); Blackjack.render(d, miIdSocket); });
socket.on('bj_estado', (d) => {
    Blackjack.render(d, miIdSocket);
    if(d.turnoActual === miIdSocket) Blackjack.controles(socket, window.clientCodigo);
    else document.getElementById('game-controls').classList.add('hidden');
    if(d.fase === 'JUGANDO' && d.turnoActual === 'DEALER') {
        const timer = document.createElement('div'); timer.className='next-round-timer'; timer.innerText = 'PREPARANDO SIGUIENTE RONDA...';
        document.getElementById('tablero').appendChild(timer);
    }
});
socket.on('mensaje_chat', (d) => Chat.recibir(d));

function renderLista(l) {
    document.getElementById('count').innerText = l.length;
    document.getElementById('lista-jugadores').innerHTML = l.map(j => `
        <div class="p-item">
            <span>${j.nombre} ${j.esBot?'🤖':''}</span>
            ${soyHost&&j.id!==miIdSocket?`<button class="btn-kick" onclick="App.kick('${j.id}')">X</button>`:''}
        </div>
    `).join('');
}