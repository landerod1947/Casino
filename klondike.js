const Klondike = {
    state: null, palos: ['H', 'D', 'C', 'S'], valores: ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'],
    iniciar() {
        let m = []; this.palos.forEach(p=>this.valores.forEach(v=>m.push({id:v+p, valor:v, palo:p, color:(p=='H'||p=='D')?'rojo':'negro', volteada:false})));
        m.sort(()=>Math.random()-0.5); this.state={stock:m,descarte:[],fundacion:{H:[],D:[],C:[],S:[]},tableau:[[],[],[],[],[],[],[]]};
        for(let i=0;i<7;i++)for(let j=0;j<=i;j++){let c=this.state.stock.pop();if(j==i)c.volteada=true;this.state.tableau[i].push(c);}
    },
    robar() {
        if(this.state.stock.length>0){let c=this.state.stock.pop();c.volteada=true;this.state.descarte.push(c);}
        else{while(this.state.descarte.length>0){let c=this.state.descarte.pop();c.volteada=false;this.state.stock.push(c);}}
    },
    render() {
        Utils.limpiar('tablero-solitario').innerHTML = `<div class="zona-sup"><div id="stock" class="pila"></div><div id="descarte" class="pila"></div><div class="spacer"></div><div id="f-H" class="pila"></div><div id="f-D" class="pila"></div><div id="f-C" class="pila"></div><div id="f-S" class="pila"></div></div><div class="zona-inf"><div id="t-0" class="pila"></div><div id="t-1" class="pila"></div><div id="t-2" class="pila"></div><div id="t-3" class="pila"></div><div id="t-4" class="pila"></div><div id="t-5" class="pila"></div><div id="t-6" class="pila"></div></div>`;
        const st=document.getElementById('stock'); st.onclick=()=>{this.robar();this.render();}; if(this.state.stock.length>0)st.appendChild(Utils.crearCartaHTML({id:'XX',volteada:false}));
        const de=document.getElementById('descarte'); if(this.state.descarte.length>0){const el=Utils.crearCartaHTML(this.state.descarte.at(-1),'carta-sol');el.onmousedown=(e)=>window.startDragSol(e,el,this.state.descarte.at(-1),{tipo:'descarte'});de.appendChild(el);}
        ['H','D','C','S'].forEach(p=>{const el=document.getElementById('f-'+p);if(this.state.fundacion[p].length>0)el.appendChild(Utils.crearCartaHTML(this.state.fundacion[p].at(-1)));el.id='fundacion-'+p;});
        this.state.tableau.forEach((pila,i)=>{const el=document.getElementById('t-'+i);el.id='tableau-'+i;pila.forEach((c,pos)=>{const ce=Utils.crearCartaHTML(c,'carta-sol');ce.style.top=(pos*(c.volteada?30:5))+'px';if(c.volteada)ce.onmousedown=(e)=>window.startDragSol(e,ce,c,{tipo:'tableau',idx:i,pos:pos});el.appendChild(ce);});});
    },
    validar(c, destId, tipoDest) {
        if(tipoDest==='fundacion'){const p=destId.split('-')[1],pila=this.state.fundacion[p];if(c.palo!==p)return false;if(pila.length===0)return c.valor==='A';return this.valores.indexOf(c.valor)===this.valores.indexOf(pila.at(-1).valor)+1;}
        if(tipoDest==='tableau'){const idx=parseInt(destId.split('-')[1]),pila=this.state.tableau[idx];if(pila.length===0)return c.valor==='K';const tope=pila.at(-1);return(c.color!==tope.color)&&(this.valores.indexOf(c.valor)===this.valores.indexOf(tope.valor)-1);}
        return false;
    },
    ejecutar(org, destId, grp) {
        if(org.tipo==='tableau'){const p=this.state.tableau[org.idx];p.splice(org.pos,grp.length);if(p.length>0)p.at(-1).volteada=true;}else if(org.tipo==='descarte')this.state.descarte.pop();
        if(destId.startsWith('tableau'))this.state.tableau[parseInt(destId.split('-')[1])].push(...grp);else if(destId.startsWith('fundacion'))this.state.fundacion[destId.split('-')[1]].push(grp[0]);
    }
};