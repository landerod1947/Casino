const Chat = {
    recibir: (d) => {
        const msg = `<div><b>${d.nombre}:</b> ${d.texto}</div>`;
        const boxes = ['chat-msgs', 'chat-msgs-game'];
        boxes.forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.innerHTML += msg; el.scrollTop = el.scrollHeight; }
        });
    },
    enviar: (id) => {
        const i = document.getElementById(id);
        if(i.value) { window.clientSocket.emit('enviar_mensaje', {codigoSala: window.clientCodigo, nombre: window.clientNombre, texto: i.value}); i.value=''; }
    }
};