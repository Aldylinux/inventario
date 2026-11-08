// ==========================================
// 1. REGISTRO PWA Y SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log(err));
    });
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

// ==========================================
// 2. MENÚ MÓVIL
// ==========================================
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('mobile-overlay');

function toggleMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}
if(menuToggle) menuToggle.addEventListener('click', toggleMenu);
if(overlay) overlay.addEventListener('click', toggleMenu);

// ==========================================
// 3. PESTAÑAS
// ==========================================
function showTab(tabId, boton) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (boton) boton.classList.add('active');
    else {
        const botones = document.querySelectorAll('.nav-btn');
        if(tabId === 'inventario') botones[1].classList.add('active');
        if(tabId === 'ventas') botones[3].classList.add('active');
    }
    if (sidebar && sidebar.classList.contains('open')) toggleMenu();
}

const formatCOP = (num) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);

// ==========================================
// 4. BASES DE DATOS LOCALES Y GOOGLE SHEETS
// ==========================================
let inventario = JSON.parse(localStorage.getItem('tecnoaldy_inventario')) || [];
let ventas = JSON.parse(localStorage.getItem('tecnoaldy_ventas')) || [];
let equipoEncontrado = null; 

// ¡PEGA AQUÍ TU ENLACE!
const API_URL = "https://script.google.com/macros/s/AKfycbzRxiC9YOdQLh8Epn9rqURvAyL_NiQ7h6rQYDxBimHuh0tjYlM6QcekPTelvByg1_c1/exec"; 

// Descargar los datos desde Google Sheets al abrir la app
async function sincronizarDesdeNube() {
    if (API_URL === "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") return;
    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();
        
        inventario = datos.inventario;
        ventas = datos.ventas;
        guardarDatosLocales();
        renderizarVistas();
    } catch (error) {
        console.log("Error al sincronizar con la nube, usando datos locales:", error);
    }
}
sincronizarDesdeNube(); // Ejecutar al cargar la página

function guardarDatosLocales() {
    localStorage.setItem('tecnoaldy_inventario', JSON.stringify(inventario));
    localStorage.setItem('tecnoaldy_ventas', JSON.stringify(ventas));
}

function renderizarVistas() {
    const tbodyInventario = document.querySelector('#tabla-inventario tbody');
    const tbodyVentas = document.querySelector('#tabla-ventas tbody');
    const listaImeis = document.getElementById('lista-imeis');
    
    tbodyInventario.innerHTML = '';
    listaImeis.innerHTML = ''; 
    inventario.forEach(equipo => {
        tbodyInventario.innerHTML += `
            <tr>
                <td>${equipo.fecha}</td>
                <td>${equipo.imei}</td>
                <td><strong>${equipo.modelo}</strong></td>
                <td>${equipo.ram}/${equipo.rom}</td>
                <td>${formatCOP(equipo.precio_entrada)}</td>
            </tr>
        `;
        listaImeis.innerHTML += `<option value="${equipo.imei}">${equipo.modelo}</option>`;
    });

    tbodyVentas.innerHTML = '';
    ventas.forEach(venta => {
        tbodyVentas.innerHTML += `
            <tr>
                <td style="font-size: 13px;">${venta.fecha_hora_venta}</td>
                <td>${venta.imei}</td>
                <td><strong>${venta.modelo}</strong></td>
                <td>${formatCOP(venta.precio_entrada)}</td>
                <td>${formatCOP(venta.precio_venta)}</td>
                <td style="color: #28a745; font-weight: bold;">+ ${formatCOP(venta.ganancia)}</td>
            </tr>
        `;
    });
}

// ==========================================
// 5. AUTOCOMPLETADO (RED + PLACEHOLDER)
// ==========================================
const tacDB = {
    "35912345": { modelo: "Samsung Galaxy A54", ram: 8, rom: 256 } 
};

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
        document.getElementById('modelo').placeholder = `TAC (${tac}) no hallado en red. Escribe manual...`;
        document.getElementById('ram').placeholder = `Ej: 8`;
        document.getElementById('rom').placeholder = `Ej: 256`;
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
// 6. INGRESOS Y VENTAS (Sincronizado a Nube)
// ==========================================
document.getElementById('form-ingreso').addEventListener('submit', function(e) {
    e.preventDefault();
    const imeiIngresado = document.getElementById('imei').value;
    
    if (inventario.find(eq => eq.imei === imeiIngresado)) {
        alert("Este IMEI ya está registrado en el inventario.");
        return;
    }

    const nuevoEquipo = {
        imei: imeiIngresado,
        fecha: document.getElementById('fecha').value,
        modelo: document.getElementById('modelo').value,
        ram: document.getElementById('ram').value,
        rom: document.getElementById('rom').value,
        precio_entrada: parseFloat(document.getElementById('precio_entrada').value)
    };

    // 1. Guardar y mostrar en pantalla INMEDIATAMENTE
    inventario.push(nuevoEquipo);
    guardarDatosLocales();
    renderizarVistas();
    this.reset();
    showTab('inventario'); 

    // 2. Enviar a Google Sheets en segundo plano
    if(API_URL !== "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'agregar', equipo: nuevoEquipo }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).catch(err => console.log("Error al subir a Sheets:", err));
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

    const precioVenta = parseFloat(document.getElementById('precio_venta').value);
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-CO'); 
    const horaFormateada = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const nuevaVenta = {
        ...equipoEncontrado,
        fecha_hora_venta: `${fechaFormateada} - ${horaFormateada}`,
        precio_venta: precioVenta,
        ganancia: precioVenta - equipoEncontrado.precio_entrada
    };

    // 1. Quitar de inventario y pasar a ventas INMEDIATAMENTE
    inventario = inventario.filter(item => item.imei !== equipoEncontrado.imei);
    ventas.push(nuevaVenta);
    
    guardarDatosLocales();
    renderizarVistas();
    this.reset();
    document.getElementById('info-equipo-venta').style.display = 'none';
    document.getElementById('btn-confirmar-venta').disabled = true;
    equipoEncontrado = null;
    showTab('ventas');

    // 2. Avisar a Google Sheets para que actualice ambas pestañas
    if(API_URL !== "AQUI_PEGA_TU_URL_DE_APPS_SCRIPT") {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ accion: 'vender', venta: nuevaVenta }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).catch(err => console.log("Error al subir venta a Sheets:", err));
    }
});

// ==========================================
// 7. ESCÁNER AUTOMÁTICO
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
        onScanFailure
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

function onScanFailure() {}

document.getElementById('fecha').value = new Date().toISOString().split('T')[0];