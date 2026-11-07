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
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (boton) {
        boton.classList.add('active');
    } else {
        const botones = document.querySelectorAll('.nav-btn');
        if(tabId === 'inventario') botones[1].classList.add('active');
        if(tabId === 'ventas') botones[3].classList.add('active');
    }

    if (sidebar && sidebar.classList.contains('open')) {
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
// 5. AUTOCOMPLETADO INTELIGENTE DE IMEI (NUEVO)
// ==========================================
// Diccionario de los primeros 8 dígitos (TAC). 
// Puedes ir agregando los de los equipos que más vendes aquí:
const tacDB = {
    "35912345": { modelo: "Samsung Galaxy A54", ram: 8, rom: 256 },
    "86123456": { modelo: "Xiaomi Redmi Note 14 Pro", ram: 8, rom: 256 }, // Ejemplo basado en tus consultas recientes
    "35876543": { modelo: "iPhone 16 Pro Max", ram: 8, rom: 256 },
    "35353535": { modelo: "Tecno Spark 20", ram: 8, rom: 256 }
};

function autocompletarDatosIMEI(imei) {
    // El IMEI debe tener al menos 8 dígitos para extraer el TAC
    if (imei.length >= 8) {
        const tac = imei.substring(0, 8); // Extrae los primeros 8 números
        
        // Busca si el TAC está en tu base de datos local
        if (tacDB[tac]) {
            document.getElementById('modelo').value = tacDB[tac].modelo;
            document.getElementById('ram').value = tacDB[tac].ram;
            document.getElementById('rom').value = tacDB[tac].rom;
            
            // Pequeño efecto visual para que sepas que funcionó
            document.getElementById('modelo').style.borderColor = "#28a745";
            setTimeout(() => { document.getElementById('modelo').style.borderColor = "var(--border-color)"; }, 1000);
        }
    }
}

// Escucha cuando escribes el IMEI a mano o usas una pistola de código de barras
document.getElementById('imei').addEventListener('input', function(e) {
    if(e.target.value.length === 15) {
        autocompletarDatosIMEI(e.target.value);
    }
});


// ==========================================
// 6. LÓGICA DE INGRESOS Y VENTAS
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
// 7. ESCÁNER DE CÓDIGOS AUTOMÁTICO (Cámara Trasera)
// ==========================================
let escannerActivo = null;
let inputDestino = '';

function abrirScanner(inputId) {
    inputDestino = inputId;
    document.getElementById('scanner-modal').style.display = 'block';
    
    // Configuramos el lector sin la interfaz fea (solo la cámara)
    escannerActivo = new Html5Qrcode("reader");
    
    const configEscaneo = { 
        fps: 10, 
        qrbox: { width: 280, height: 100 } // Rectángulo ancho para IMEI
    };

    // Forzar el uso de la cámara trasera ("environment") de manera automática
    escannerActivo.start(
        { facingMode: "environment" }, 
        configEscaneo, 
        onScanSuccess, 
        onScanFailure
    ).catch(err => {
        alert("Error al abrir la cámara. Asegúrate de darle permisos.");
        cerrarScanner();
    });
}

function cerrarScanner() {
    document.getElementById('scanner-modal').style.display = 'none';
    if(escannerActivo) {
        escannerActivo.stop().then(() => {
            escannerActivo.clear();
            escannerActivo = null;
        }).catch(err => {
            console.log("Error al detener el escáner:", err);
        });
    }
}

function onScanSuccess(textoDecodificado, resultado) {
    // Pone el texto en el input correspondiente
    document.getElementById(inputDestino).value = textoDecodificado;
    document.getElementById(inputDestino).dispatchEvent(new Event('input')); 
    
    if(inputDestino === 'imei') {
        autocompletarDatosIMEI(textoDecodificado);
    }
    
    // Cierra la cámara automáticamente al leer el código
    cerrarScanner();
}

function onScanFailure(error) {
    // Ignorar errores silenciosos mientras intenta enfocar
}