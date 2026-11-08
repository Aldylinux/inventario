// ==========================================
// 1. FORMATO DE MONEDA EN TIEMPO REAL
// ==========================================
window.formatearMoneda = function(input) {
    let valor = input.value.replace(/\D/g, ''); // Deja solo los números
    if (valor === '') {
        input.value = '';
        return;
    }
    input.value = new Intl.NumberFormat('es-CO').format(valor); // Separa por puntos
};

// Convierte un número con puntos ("1.300.000") de vuelta a número real (1300000)
const limpiarNumero = (texto) => parseInt(texto.replace(/\./g, '')) || 0;

// ==========================================
// 2. REGISTRO PWA Y MENÚS
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(err => console.log(err)));
}

let eventoInstalacion = null;
const installBanner = document.getElementById('install-banner');
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    if(installBanner) installBanner.style.display = 'flex'; 
});

const btnInstalar = document.getElementById('btn-instalar');
if(btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        installBanner.style.display = 'none';
        if (eventoInstalacion) {
            eventoInstalacion.prompt();
            await eventoInstalacion.userChoice;
            eventoInstalacion = null;
        }
    });
}
const btnCerrarBanner = document.getElementById('btn-cerrar-banner');
if(btnCerrarBanner) btnCerrarBanner.addEventListener('click', () => installBanner.style.display = 'none');

const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobile-overlay');

function toggleMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}
if(menuToggle) menuToggle.addEventListener('click', toggleMenu);
if(overlay) overlay.addEventListener('click', toggleMenu);

function showTab(tabId, boton) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (boton) boton.classList.add('active');
    if (sidebar && sidebar.classList.contains('open')) toggleMenu();
}

const formatCOP = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);

// ==========================================
// 3. BASES DE DATOS LOCALES Y GOOGLE SHEETS
// ==========================================
let inventario = JSON.parse(localStorage.getItem('tecnoaldy_inventario')) || [];
let ventas = JSON.parse(localStorage.getItem('tecnoaldy_ventas')) || [];
let registroHistorico = JSON.parse(localStorage.getItem('tecnoaldy_registro')) || inventario.slice(); 
let equipoEncontrado = null; 

// ¡¡¡PEGA AQUÍ TU ENLACE NUEVO DEL SCRIPT!!!
const API_URL = "https://script.google.com/macros/s/AKfycbzsuvl2Ptw4TaAOQLm1Jim8Ophka5UAaO4BbISmyFDe5_aKCf38kD1HpH_3fhetxZY3/exec"; 

async function sincronizarDesdeNube() {
    if (API_URL === "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") return;
    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();
        
        inventario = datos.inventario || [];
        ventas = datos.ventas || [];
        registroHistorico = datos.registro || [];
        guardarDatosLocales();
        renderizarVistas();
    } catch (error) {
        console.log("Error al sincronizar con la nube, usando datos locales:", error);
    }
}
sincronizarDesdeNube();

function guardarDatosLocales() {
    localStorage.setItem('tecnoaldy_inventario', JSON.stringify(inventario));
    localStorage.setItem('tecnoaldy_ventas', JSON.stringify(ventas));
    localStorage.setItem('tecnoaldy_registro', JSON.stringify(registroHistorico));
}

function renderizarVistas() {
    const tbodyInventario = document.querySelector('#tabla-inventario tbody');
    const tbodyVentas = document.querySelector('#tabla-ventas tbody');
    const tbodyRegistro = document.querySelector('#tabla-registro tbody');
    const listaImeis = document.getElementById('lista-imeis');
    
    // 1. Inventario Actual
    tbodyInventario.innerHTML = '';
    listaImeis.innerHTML = ''; 
    inventario.forEach(equipo => {
        tbodyInventario.innerHTML += `
            <tr>
                <td>${equipo.fecha}</td><td>${equipo.imei}</td>
                <td><strong>${equipo.modelo}</strong></td><td>${equipo.ram}/${equipo.rom}</td>
                <td>${formatCOP(equipo.precio_entrada)}</td>
            </tr>`;
        listaImeis.innerHTML += `<option value="${equipo.imei}">${equipo.modelo}</option>`;
    });

    // 2. Ventas (Ahora incluye plataforma)
    tbodyVentas.innerHTML = '';
    ventas.forEach(venta => {
        tbodyVentas.innerHTML += `
            <tr>
                <td style="font-size: 13px;">${venta.fecha_hora_venta}</td>
                <td>${venta.imei}</td><td><strong>${venta.modelo}</strong></td>
                <td>${formatCOP(venta.precio_entrada)}</td><td>${formatCOP(venta.precio_venta)}</td>
                <td style="color: var(--primary-orange); font-size: 13px;">${venta.plataforma || 'N/A'}</td>
                <td style="color: #28a745; font-weight: bold;">+ ${formatCOP(venta.ganancia)}</td>
            </tr>`;
    });

    // 3. Registro Histórico Master
    if(tbodyRegistro) {
        tbodyRegistro.innerHTML = '';
        registroHistorico.forEach(equipo => {
            tbodyRegistro.innerHTML += `
                <tr>
                    <td>${equipo.fecha}</td><td>${equipo.imei}</td>
                    <td><strong>${equipo.modelo}</strong></td><td>${equipo.ram}/${equipo.rom}</td>
                    <td>${formatCOP(equipo.precio_entrada)}</td>
                </tr>`;
        });
    }
}

// ==========================================
// 4. AUTOCOMPLETADO IMEI
// ==========================================
const tacDB = { "35912345": { modelo: "Samsung Galaxy A54", ram: 8, rom: 256 } };

async function autocompletarDatosIMEI(imei) {
    const tac = imei.substring(0, 8);
    const spinner = document.getElementById('loading-imei');
    const btnScan = document.getElementById('btn-scan-imei');
    
    if(spinner) spinner.style.display = 'block';
    if(btnScan) btnScan.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (tacDB[tac]) {
        document.getElementById('modelo').value = tacDB[tac].modelo;
        document.getElementById('ram').value = tacDB[tac].ram;
        document.getElementById('rom').value = tacDB[tac].rom;
        document.getElementById('modelo').style.borderColor = "#28a745";
        setTimeout(() => { document.getElementById('modelo').style.borderColor = "var(--border-color)"; }, 1500);
        if(spinner) spinner.style.display = 'none';
        if(btnScan) btnScan.style.display = 'flex';
        return;
    }

    try {
        const respuesta = await fetch(`https://api.imeidb.org/v1/tac/${tac}`);
        if (!respuesta.ok) throw new Error("API denegada");
        const datos = await respuesta.json();
        
        document.getElementById('modelo').value = datos.model || "";
        document.getElementById('ram').value = datos.ram || "";
        document.getElementById('rom').value = datos.rom || "";
        document.getElementById('modelo').style.borderColor = "#28a745";
        setTimeout(() => { document.getElementById('modelo').style.borderColor = "var(--border-color)"; }, 1500);
    } catch (error) {
        document.getElementById('modelo').value = "";
        document.getElementById('ram').value = "";
        document.getElementById('rom').value = "";
        document.getElementById('modelo').placeholder = `TAC (${tac}) no hallado en red...`;
        document.getElementById('modelo').style.borderColor = "#ffcc00";
        setTimeout(() => { document.getElementById('modelo').style.borderColor = "var(--border-color)"; }, 2500);
    } finally {
        if(spinner) spinner.style.display = 'none';
        if(btnScan) btnScan.style.display = 'flex';
    }
}

document.getElementById('imei').addEventListener('input', function(e) {
    const val = e.target.value;
    if(val.length >= 14 && val.length <= 16) {
        if(document.getElementById('loading-imei').style.display === 'block') return;
        autocompletarDatosIMEI(val);
    }
});

// ==========================================
// 5. INGRESOS Y VENTAS
// ==========================================
document.getElementById('form-ingreso').addEventListener('submit', function(e) {
    e.preventDefault();
    const imeiIngresado = document.getElementById('imei').value;
    
    if (inventario.find(eq => eq.imei === imeiIngresado)) {
        alert("Este IMEI ya está registrado.");
        return;
    }

    const nuevoEquipo = {
        imei: imeiIngresado,
        fecha: document.getElementById('fecha').value,
        modelo: document.getElementById('modelo').value,
        ram: document.getElementById('ram').value,
        rom: document.getElementById('rom').value,
        precio_entrada: limpiarNumero(document.getElementById('precio_entrada').value) // Limpia puntos para hacer cálculos
    };

    inventario.push(nuevoEquipo);
    registroHistorico.push(nuevoEquipo); // Lo añade al Master
    
    guardarDatosLocales();
    renderizarVistas();
    this.reset();
    showTab('inventario'); 

    if(API_URL !== "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'agregar', equipo: nuevoEquipo }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).catch(err => console.log(err));
    }
});

document.getElementById('buscar_imei').addEventListener('input', function(e) {
    const valorInput = e.target.value;
    equipoEncontrado = inventario.find(eq => eq.imei.toString() === valorInput);
    const infoBox = document.getElementById('info-equipo-venta');
    const btnConfirmar = document.getElementById('btn-confirmar-venta');

    if (equipoEncontrado) {
        document.getElementById('detalle-modelo').innerText = `${equipoEncontrado.modelo} (${equipoEncontrado.ram}GB / ${equipoEncontrado.rom}GB)`;
        document.getElementById('detalle-costo').innerText = `Costo: ${formatCOP(equipoEncontrado.precio_entrada)}`;
        infoBox.style.display = 'block';
        btnConfirmar.disabled = false;
    } else {
        infoBox.style.display = 'none';
        btnConfirmar.disabled = true;
    }
});

document.getElementById('form-venta').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!equipoEncontrado) return;

    // Lee el input limpio de puntos
    const precioVenta = limpiarNumero(document.getElementById('precio_venta').value);
    const plataformaSeleccionada = document.getElementById('plataforma_venta').value;
    
    const ahora = new Date();
    const nuevaVenta = {
        ...equipoEncontrado,
        fecha_hora_venta: `${ahora.toLocaleDateString('es-CO')} - ${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
        precio_venta: precioVenta,
        plataforma: plataformaSeleccionada, // Guarda la plataforma
        ganancia: precioVenta - equipoEncontrado.precio_entrada
    };
    
    inventario = inventario.filter(item => item.imei !== equipoEncontrado.imei);
    ventas.push(nuevaVenta);
    
    guardarDatosLocales();
    renderizarVistas();
    this.reset();
    document.getElementById('info-equipo-venta').style.display = 'none';
    document.getElementById('btn-confirmar-venta').disabled = true;
    equipoEncontrado = null;
    showTab('ventas');

    if(API_URL !== "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'vender', venta: nuevaVenta }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).catch(err => console.log(err));
    }
});

// ==========================================
// 6. ESCÁNER
// ==========================================
let escannerActivo = null;
let inputDestino = '';

function abrirScanner(inputId) {
    inputDestino = inputId;
    document.getElementById('scanner-modal').style.display = 'block';
    
    escannerActivo = new Html5Qrcode("reader");
    escannerActivo.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 280, height: 100 } }, 
        onScanSuccess, 
        () => {}
    ).catch(err => {
        alert("Otorga permisos de cámara.");
        cerrarScanner();
    });
}

function cerrarScanner() {
    document.getElementById('scanner-modal').style.display = 'none';
    if(escannerActivo) {
        escannerActivo.stop().then(() => {
            escannerActivo.clear();
            escannerActivo = null;
        }).catch(err => console.log(err));
    }
}

function onScanSuccess(textoDecodificado) {
    const inputElement = document.getElementById(inputDestino);
    inputElement.value = textoDecodificado;
    inputElement.dispatchEvent(new Event('input', { bubbles: true })); 
    cerrarScanner();
}

document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
// ==========================================
// 8. GENERADOR DE REPORTES PDF
// ==========================================
window.descargarPDF = function(tipo) {
    // Inicializar jsPDF en modo horizontal ('l' = landscape) para que quepan las columnas
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 

    let titulo = "";
    let columnas = [];
    let filas = [];

    // Preparamos los datos dependiendo de qué botón oprimió Aldi
    if (tipo === 'inventario') {
        titulo = "Inventario Actual - TecnoAldy";
        columnas = ["Fecha", "IMEI", "Modelo", "RAM/ROM", "Precio Costo"];
        filas = inventario.map(eq => [
            eq.fecha, eq.imei, eq.modelo, `${eq.ram} / ${eq.rom}`, formatCOP(eq.precio_entrada)
        ]);
    } else if (tipo === 'ventas') {
        titulo = "Historial de Ventas - TecnoAldy";
        columnas = ["Fecha Venta", "IMEI", "Modelo", "Plataforma", "Costo", "Venta", "Ganancia"];
        filas = ventas.map(v => [
            v.fecha_hora_venta, v.imei, v.modelo, v.plataforma || 'Contado', 
            formatCOP(v.precio_entrada), formatCOP(v.precio_venta), formatCOP(v.ganancia)
        ]);
    } else if (tipo === 'registro') {
        titulo = "Registro Histórico Master - TecnoAldy";
        columnas = ["Fecha Ingreso", "IMEI", "Modelo", "RAM/ROM", "Precio Costo"];
        filas = registroHistorico.map(eq => [
            eq.fecha, eq.imei, eq.modelo, `${eq.ram} / ${eq.rom}`, formatCOP(eq.precio_entrada)
        ]);
    }

    // Dibujar el título y la fecha en el PDF
    doc.setFontSize(18);
    doc.setTextColor(255, 102, 0); // Título en naranja TecnoAldy
    doc.text(titulo, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); // Gris oscuro
    doc.text(`Reporte generado el: ${new Date().toLocaleString('es-CO')}`, 14, 28);

    // Dibujar la tabla
    doc.autoTable({
        startY: 35,
        head: [columnas],
        body: filas,
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 102, 0], // Fondo del encabezado naranja
            textColor: [255, 255, 255], 
            fontStyle: 'bold' 
        },
        styles: { 
            fontSize: 10, 
            textColor: [0, 0, 0], // Texto negro por defecto para todo
            cellPadding: 4 
        },
        didParseCell: function (data) {
            // Reglas de colores solicitadas por Aldi solo para el contenido (body)
            if (data.section === 'body') {
                const nombreColumna = columnas[data.column.index];
                
                // Precio de Entrada / Costo en VERDE
                if (nombreColumna === "Precio Costo" || nombreColumna === "Costo") {
                    data.cell.styles.textColor = [40, 167, 69]; 
                    data.cell.styles.fontStyle = 'bold';
                }
                // Precio de Salida / Venta en ROJO
                if (nombreColumna === "Venta") {
                    data.cell.styles.textColor = [220, 53, 69]; 
                    data.cell.styles.fontStyle = 'bold';
                }
                // Plataforma en AZUL
                if (nombreColumna === "Plataforma") {
                    data.cell.styles.textColor = [0, 123, 255]; 
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Guardar el archivo en el celular o PC
    const nombreArchivo = titulo.replace(/ /g, "_").toLowerCase();
    doc.save(`${nombreArchivo}.pdf`);
};