// ==========================================
// 1. REGISTRO PWA Y SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado con éxito'))
            .catch(err => console.log('Error al registrar Service Worker:', err));
    });
}

let eventoInstalacion = null;
const installBanner = document.getElementById('install-banner');
const btnInstalar = document.getElementById('btn-instalar');
const btnCerrarBanner = document.getElementById('btn-cerrar-banner');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    if(installBanner) installBanner.style.display = 'flex'; 
});

if(btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        installBanner.style.display = 'none';
        if (eventoInstalacion) {
            eventoInstalacion.prompt();
            const { outcome } = await eventoInstalacion.userChoice;
            eventoInstalacion = null;
        }
    });
}

if(btnCerrarBanner) {
    btnCerrarBanner.addEventListener('click', () => {
        installBanner.style.display = 'none';
    });
}

// ==========================================
// 2. LÓGICA DEL MENÚ MÓVIL (Hamburguesa)
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
// 3. LÓGICA DE INTERFAZ Y PESTAÑAS
// ==========================================
function showTab(tabId, boton) {
    // Ocultar contenidos
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Mostrar seleccionada
    document.getElementById(tabId).classList.add('active');
    
    if (boton) {
        boton.classList.add('active');
    } else {
        const botones = document.querySelectorAll('.nav-btn');
        if(tabId === 'inventario') botones[1].classList.add('active');
        if(tabId === 'ventas') botones[3].classList.add('active');
    }

    // Si estamos en móvil y el menú está abierto, cerrarlo automáticamente
    if (sidebar.classList.contains('open')) {
        toggleMenu();
    }
}

const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
};

// ==========================================
// 4. BASES DE DATOS LOCALES
// ==========================================
let inventario = JSON.parse(localStorage.getItem('tecnoaldy_inventario')) || [];
let ventas = JSON.parse(localStorage.getItem('tecnoaldy_ventas')) || [];
let equipoEncontrado = null; 

// ==========================================
// 5. LÓGICA DE INGRESOS Y VENTAS
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

    inventario.push(nuevoEquipo);
    guardarDatos();
    renderizarVistas();
    this.reset();
    
    showTab('inventario'); 
});

document.getElementById('buscar_imei').addEventListener('input', function(e) {
    const valorInput = e.target.value;
    equipoEncontrado = inventario.find(eq => eq.imei === valorInput);
    const infoBox = document.getElementById('info-equipo-venta');
    const btnConfirmar = document.getElementById('btn-confirmar-venta');

    if (equipoEncontrado) {
        document.getElementById('detalle-modelo').innerText = `${equipoEncontrado.modelo} (${equipoEncontrado.ram}GB RAM / ${equipoEncontrado.rom}GB ROM)`;
        document.getElementById('detalle-costo').innerText = `Costo de entrada: ${formatCOP(equipoEncontrado.precio_entrada)}`;
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

    inventario = inventario.filter(item => item.imei !== equipoEncontrado.imei);
    ventas.push(nuevaVenta);
    
    guardarDatos();
    renderizarVistas();
    
    this.reset();
    document.getElementById('info-equipo-venta').style.display = 'none';
    document.getElementById('btn-confirmar-venta').disabled = true;
    equipoEncontrado = null;

    showTab('ventas');
});

function guardarDatos() {
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
        listaImeis.innerHTML += `<option value="${equipo.imei}">${equipo.modelo} (${equipo.ram}/${equipo.rom})</option>`;
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
// 6. ESCÁNER DE CÓDIGOS (html5-qrcode)
// ==========================================
let escannerActivo = null;
let inputDestino = '';

function abrirScanner(inputId) {
    inputDestino = inputId;
    document.getElementById('scanner-modal').style.display = 'block';
    
    escannerActivo = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 300, height: 100 } 
    }, false);
    
    escannerActivo.render(onScanSuccess, onScanFailure);
}

function cerrarScanner() {
    document.getElementById('scanner-modal').style.display = 'none';
    if(escannerActivo) {
        escannerActivo.clear();
    }
}

function onScanSuccess(textoDecodificado, resultado) {
    document.getElementById(inputDestino).value = textoDecodificado;
    document.getElementById(inputDestino).dispatchEvent(new Event('input'));
    cerrarScanner();
}

function onScanFailure(error) {}

document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
renderizarVistas();