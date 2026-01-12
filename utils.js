const Utils = {
    crearCartaHTML: (c, cl='') => {
        const d = document.createElement('div');
        const flip = (c.volteada !== false);
        d.className = `carta ${flip ? 'c'+c.id : 'reverso'} ${cl}`;
        if(flip) d.style.backgroundImage = `url('img/${c.id}.png')`;
        d.id = c.id; return d;
    },
    limpiar: (id) => { const el = document.getElementById(id); if(el) el.innerHTML=''; return el; },
    chip: (v, cb) => { const f = document.createElement('div'); f.className='chip'; f.innerText=v; f.onclick=cb; return f; }
};