const Blackjack = {
    render: (d, miId) => {
        const m = Utils.limpiar('tablero');
        if(d.fase === 'APOSTANDO') {
            const yo = d.jugadores.find(j=>j.id===miId);
            const ui = document.createElement('div'); ui.className='betting-ui';
            ui.innerHTML = `<h3>$${yo.saldo}</h3><button onclick="window.clientSocket.emit('bj_apostar', {codigo: window.clientCodigo, monto: 100})" class="btn-gold">APOSTAR $100</button>`;
            m.appendChild(ui);
        } else {
            const dealer = document.createElement('div'); dealer.className='dealer-zone';
            dealer.innerHTML = `<div class="label">DEALER (${d.puntosDealer})</div><div class="cards"></div>`;
            d.manoDealer.forEach(c => dealer.querySelector('.cards').appendChild(Utils.crearCartaHTML(c)));
            m.appendChild(dealer);

            const area = document.createElement('div'); area.className='players-zone';
            d.jugadores.forEach(j => {
                if(j.id === d.dealerId) return;
                const p = document.createElement('div'); p.className = (j.id===miId) ? 'hand-box mine' : 'hand-box';
                if(j.id===d.turnoActual) p.classList.add('active');
                p.innerHTML = `<div class="p-name">${j.nombre}</div><div class="cards"></div>`;
                j.mano.forEach(c => p.querySelector('.cards').appendChild(Utils.crearCartaHTML(c)));
                area.appendChild(p);
            });
            m.appendChild(area);
        }
    },
    controles: (s, cod) => {
        const c = document.getElementById('game-controls'); c.classList.remove('hidden'); c.innerHTML='';
        const b1 = document.createElement('button'); b1.innerText='PEDIR'; b1.className='btn-gold'; b1.onclick=()=>s.emit('bj_accion', {codigo:cod, accion:'PEDIR'});
        const b2 = document.createElement('button'); b2.innerText='PLANTAR'; b2.className='btn-dark'; b2.onclick=()=>s.emit('bj_accion', {codigo:cod, accion:'PLANTARSE'});
        c.append(b1, b2);
    }
};