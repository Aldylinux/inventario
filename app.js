// ==========================================
// 1. FORMATO DE MONEDA Y FECHAS
// ==========================================
window.formatearMoneda = function(input) {
    let valor = input.value.replace(/\D/g, ''); 
    if (valor === '') { input.value = ''; return; }
    input.value = new Intl.NumberFormat('es-CO').format(valor); 
};
const limpiarNumero = (texto) => parseInt(texto.replace(/\./g, '')) || 0;
const limpiarFecha = (fecha) => fecha ? fecha.split('T')[0] : ''; // Quita el error T05:00 de Google Sheets

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
    
    if (boton) {
        boton.classList.add('active');
    } else {
        const btnActivo = document.querySelector(`.nav-btn[onclick*="${tabId}"]`);
        if(btnActivo) btnActivo.classList.add('active');
    }
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
const API_URL = "https://script.google.com/macros/s/AKfycbyAA7YCwYfS-br1AZ9MhFocPWLQDk7rDsYnYcOst5Kx0lR8IO6eJUFCTnO536dsTchJ/exec"; 

async function sincronizarDesdeNube() {
    if (API_URL === "https://script.google.com/macros/s/AKfycbyAA7YCwYfS-br1AZ9MhFocPWLQDk7rDsYnYcOst5Kx0lR8IO6eJUFCTnO536dsTchJ/exec") return;
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
    const listaImeisVentas = document.getElementById('lista-imeis-ventas');
    
    tbodyInventario.innerHTML = '';
    listaImeis.innerHTML = ''; 
    inventario.forEach(equipo => {
        tbodyInventario.innerHTML += `
            <tr>
                <td>${limpiarFecha(equipo.fecha)}</td><td>${equipo.imei}</td>
                <td><strong>${equipo.modelo}</strong></td><td>${equipo.ram}/${equipo.rom}</td>
                <td>${formatCOP(equipo.precio_entrada)}</td>
            </tr>`;
        listaImeis.innerHTML += `<option value="${equipo.imei}">${equipo.modelo}</option>`;
    });

    tbodyVentas.innerHTML = '';
    if(listaImeisVentas) listaImeisVentas.innerHTML = '';
    ventas.forEach(venta => {
        tbodyVentas.innerHTML += `
            <tr>
                <td style="font-size: 13px;">${limpiarFecha(venta.fecha_hora_venta)}</td>
                <td>${venta.imei}</td><td><strong>${venta.modelo}</strong></td>
                <td>${formatCOP(venta.precio_entrada)}</td><td>${formatCOP(venta.precio_venta)}</td>
                <td style="color: var(--primary-orange); font-size: 13px;">${venta.plataforma || 'N/A'}</td>
                <td style="color: #28a745; font-weight: bold;">+ ${formatCOP(venta.ganancia)}</td>
            </tr>`;
        if(listaImeisVentas) listaImeisVentas.innerHTML += `<option value="${venta.imei}">${venta.modelo}</option>`;
    });

    if(tbodyRegistro) {
        tbodyRegistro.innerHTML = '';
        registroHistorico.forEach(equipo => {
            tbodyRegistro.innerHTML += `
                <tr>
                    <td>${limpiarFecha(equipo.fecha)}</td><td>${equipo.imei}</td>
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
        precio_entrada: limpiarNumero(document.getElementById('precio_entrada').value)
    };

    inventario.push(nuevoEquipo);
    registroHistorico.push(nuevoEquipo);
    
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

    const precioVenta = limpiarNumero(document.getElementById('precio_venta').value);
    const plataformaSeleccionada = document.getElementById('plataforma_venta').value;
    
    const ahora = new Date();
    const nuevaVenta = {
        ...equipoEncontrado,
        fecha_hora_venta: `${ahora.toLocaleDateString('es-CO')} - ${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
        precio_venta: precioVenta,
        plataforma: plataformaSeleccionada,
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
// 8. GENERADOR DE REPORTES PDF (TABLAS)
// ==========================================
window.descargarPDF = function(tipo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 

    let titulo = "";
    let columnas = [];
    let filas = [];

    if (tipo === 'inventario') {
        titulo = "Inventario Actual - TecnoAldy";
        columnas = ["Fecha", "IMEI", "Modelo", "RAM/ROM", "Precio Costo"];
        filas = inventario.map(eq => [
            limpiarFecha(eq.fecha), eq.imei, eq.modelo, `${eq.ram} / ${eq.rom}`, formatCOP(eq.precio_entrada)
        ]);
    } else if (tipo === 'ventas') {
        titulo = "Historial de Ventas - TecnoAldy";
        columnas = ["Fecha Venta", "IMEI", "Modelo", "Plataforma", "Costo", "Venta", "Ganancia"];
        filas = ventas.map(v => [
            limpiarFecha(v.fecha_hora_venta), v.imei, v.modelo, v.plataforma || 'Contado', 
            formatCOP(v.precio_entrada), formatCOP(v.precio_venta), formatCOP(v.ganancia)
        ]);
    } else if (tipo === 'registro') {
        titulo = "Registro Histórico Master - TecnoAldy";
        columnas = ["Fecha Ingreso", "IMEI", "Modelo", "RAM/ROM", "Precio Costo"];
        filas = registroHistorico.map(eq => [
            limpiarFecha(eq.fecha), eq.imei, eq.modelo, `${eq.ram} / ${eq.rom}`, formatCOP(eq.precio_entrada)
        ]);
    }

    doc.setFontSize(18);
    doc.setTextColor(255, 102, 0); 
    doc.text(titulo, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); 
    doc.text(`Reporte generado el: ${new Date().toLocaleString('es-CO')}`, 14, 28);

    doc.autoTable({
        startY: 35,
        head: [columnas],
        body: filas,
        theme: 'grid',
        headStyles: { fillColor: [255, 102, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, textColor: [0, 0, 0], cellPadding: 4 },
        didParseCell: function (data) {
            if (data.section === 'body') {
                const nombreColumna = columnas[data.column.index];
                if (nombreColumna === "Precio Costo" || nombreColumna === "Costo") { data.cell.styles.textColor = [40, 167, 69]; data.cell.styles.fontStyle = 'bold'; }
                if (nombreColumna === "Venta") { data.cell.styles.textColor = [220, 53, 69]; data.cell.styles.fontStyle = 'bold'; }
                if (nombreColumna === "Plataforma") { data.cell.styles.textColor = [0, 123, 255]; data.cell.styles.fontStyle = 'bold'; }
            }
        }
    });

    const nombreArchivo = titulo.replace(/ /g, "_").toLowerCase();
    doc.save(`${nombreArchivo}.pdf`);
};

// ==========================================
// 9. MÓDULO DE FACTURACIÓN Y COMPARTIR
// ==========================================
let equipoVendidoEncontrado = null;

// Lógica de Pizarra de Firma del Cliente
const canvasFirma = document.getElementById('firma_cliente');
let ctxFirma = canvasFirma ? canvasFirma.getContext('2d') : null;
let dibujando = false;

if (canvasFirma) {
    const obtenerPos = (e) => {
        const rect = canvasFirma.getBoundingClientRect();
        const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
        const clienteY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clienteX - rect.left) * (canvasFirma.width / rect.width), y: (clienteY - rect.top) * (canvasFirma.height / rect.height) };
    };

    const iniciar = (e) => { e.preventDefault(); dibujando = true; const pos = obtenerPos(e); ctxFirma.beginPath(); ctxFirma.moveTo(pos.x, pos.y); };
    const dibujar = (e) => { if (!dibujando) return; e.preventDefault(); const pos = obtenerPos(e); ctxFirma.lineTo(pos.x, pos.y); ctxFirma.strokeStyle = '#000000'; ctxFirma.lineWidth = 2; ctxFirma.stroke(); };
    const detener = () => { dibujando = false; ctxFirma.closePath(); };

    canvasFirma.addEventListener('mousedown', iniciar);
    canvasFirma.addEventListener('mousemove', dibujar);
    canvasFirma.addEventListener('mouseup', detener);
    canvasFirma.addEventListener('mouseleave', detener);
    canvasFirma.addEventListener('touchstart', iniciar, { passive: false }); 
    canvasFirma.addEventListener('touchmove', dibujar, { passive: false });
    canvasFirma.addEventListener('touchend', detener);
    
    window.limpiarFirma = () => { ctxFirma.clearRect(0, 0, canvasFirma.width, canvasFirma.height); };
}

const inputBuscarFactura = document.getElementById('buscar_imei_factura');
if (inputBuscarFactura) {
    inputBuscarFactura.addEventListener('input', function(e) {
        const valorInput = e.target.value;
        equipoVendidoEncontrado = ventas.find(eq => eq.imei.toString() === valorInput);
        const infoBox = document.getElementById('info-equipo-factura');
        const btnGenerar = document.getElementById('btn-generar-factura');

        if (equipoVendidoEncontrado) {
            document.getElementById('detalle-modelo-factura').innerText = `${equipoVendidoEncontrado.modelo}`;
            document.getElementById('detalle-venta-factura').innerText = `Vendido por: ${formatCOP(equipoVendidoEncontrado.precio_venta)} (${equipoVendidoEncontrado.plataforma || 'Contado'})`;
            infoBox.style.display = 'block';
            btnGenerar.disabled = false;
        } else {
            infoBox.style.display = 'none';
            btnGenerar.disabled = true;
        }
    });
}

const formFactura = document.getElementById('form-factura');
if (formFactura) {
    formFactura.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!equipoVendidoEncontrado) return;

        const nombre = document.getElementById('cliente_nombre').value.toUpperCase();
        const cedula = document.getElementById('cliente_cedula').value;
        const telefono = document.getElementById('cliente_telefono').value;
        const vendedor = document.getElementById('vendedor_nombre').value;
        
        // Capturar los campos nuevos opcionales de financiación
        const cuotas = document.getElementById('factura_cuotas').value;
        const valorCuota = document.getElementById('factura_valor_cuota').value;
        const frecuencia = document.getElementById('factura_frecuencia').value;

        const firmaDatos = canvasFirma.toDataURL('image/png'); 
        
        generarFacturaClientePDF(equipoVendidoEncontrado, nombre, cedula, telefono, vendedor, firmaDatos, cuotas, valorCuota, frecuencia);
        
        this.reset();
        limpiarFirma();
        document.getElementById('info-equipo-factura').style.display = 'none';
        document.getElementById('btn-generar-factura').disabled = true;
        equipoVendidoEncontrado = null;
    });
}

function generarFacturaClientePDF(equipo, cliente, cedula, telefono, vendedor, firmaClienteBase64, cuotas, valorCuota, frecuencia) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); 

        const numeroFactura = "FAC-" + Math.floor(Date.now() / 10000).toString(); 

        // LOGO TECNOALDY
        const logoImg = document.querySelector('.bg-logo img');
        if (logoImg) {
            try { doc.addImage(logoImg, 'PNG', 14, 12, 28, 28); } 
            catch(err) { console.log('Logo no renderizado', err); }
        }

        doc.setFontSize(22);
        doc.setTextColor(128, 0, 128); 
        doc.text("TECNOALDY", 105, 18, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("NIT: 24728906-0", 105, 24, { align: 'center' });
        doc.text("Cra 7 # 7-37 Camellón, Fresno - Tolima", 105, 29, { align: 'center' });
        doc.text("Tel: 302 736 4763", 105, 34, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`FACTURA DE VENTA: ${numeroFactura}`, 14, 50);
        doc.text(`FECHA DE COMPRA: ${limpiarFecha(equipo.fecha_hora_venta)}`, 14, 57);

        doc.setDrawColor(255, 102, 0);
        doc.setLineWidth(0.5);
        doc.line(14, 62, 196, 62); 
        
        doc.setFontSize(11);
        doc.text("DATOS DEL CLIENTE:", 14, 70);
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`Nombre: ${cliente}`, 14, 77);
        doc.text(`C.C / NIT: ${cedula}`, 14, 83);
        doc.text(`Teléfono: ${telefono}`, 14, 89);

        // TABLA PRINCIPAL DEL EQUIPO
        doc.autoTable({
            startY: 97,
            head: [["Cant.", "Descripción del Equipo", "IMEI", "Plataforma", "Valor Total"]],
            body: [
                ["1", equipo.modelo, equipo.imei, equipo.plataforma || 'Contado', formatCOP(equipo.precio_venta)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [255, 102, 0] },
            styles: { fontSize: 10, cellPadding: 5 }
        });

        let finalY = doc.lastAutoTable.finalY + 5;

        // --- RECUADRO DE FINANCIACIÓN (Solo aparece si llenaste los campos) ---
        if (cuotas || valorCuota || frecuencia) {
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(245, 245, 245);
            doc.rect(14, finalY, 182, 12, 'FD'); 
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, "bold");
            doc.text("DETALLE DE FINANCIACIÓN:", 18, finalY + 7);
            
            doc.setFont(undefined, "normal");
            let textoCredito = `N° Cuotas: ${cuotas || 'N/A'}    |    Valor Cuota: ${valorCuota ? '$'+valorCuota : 'N/A'}    |    Frecuencia: ${frecuencia ? 'Cada ' + frecuencia + ' días' : 'N/A'}`;
            doc.text(textoCredito, 70, finalY + 7);
            
            finalY += 20;
        } else {
            finalY += 10;
        }

        // TÉRMINOS GARANTÍA
        doc.setFontSize(11);
        doc.setTextColor(220, 53, 69); 
        doc.text("TÉRMINOS Y CONDICIONES DE GARANTÍA", 14, finalY);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const terminos = [
            "1. Garantía válida por un (1) año a partir de la fecha de compra por defectos de fábrica.",
            "2. EXCLUSIONES: La garantía NO cubre daños causados por golpes, humedad, rupturas,",
            "   display dañado, sobrecargas eléctricas o mala manipulación del usuario.",
            "3. REQUISITO INDISPENSABLE: Presentar la caja original del equipo en buen estado y esta factura.",
            "4. REGISTRO DE IMEI: El equipo debe ser registrado ante el operador móvil del cliente en un",
            "   plazo máximo de 20 días hábiles. No hay garantía por bloqueo de NO REGISTRO."
        ];
        let yPos = finalY + 7;
        terminos.forEach(linea => { doc.text(linea, 14, yPos); yPos += 5; });

        // ZONA DE FIRMAS
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        
        // Firma Vendedor
        doc.setFont("times", "italic");
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 150); 
        doc.text(vendedor, 50, yPos + 27, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.line(20, yPos + 30, 80, yPos + 30);
        doc.text("Firma Vendedor Autorizado", 50, yPos + 35, { align: 'center' });
        doc.text("TECNOALDY", 50, yPos + 40, { align: 'center' });

        // Firma Cliente
        doc.addImage(firmaClienteBase64, 'PNG', 130, yPos - 5, 60, 32); 
        doc.line(130, yPos + 30, 190, yPos + 30);
        doc.text("Firma Cliente / Comprador", 160, yPos + 35, { align: 'center' });
        doc.setFont(undefined, 'bold');
        doc.text(cliente, 160, yPos + 40, { align: 'center' }); 
        doc.setFont(undefined, 'normal');
        doc.text(`C.C: ${cedula}`, 160, yPos + 45, { align: 'center' }); 

        const nombreArchivo = `Factura_${cliente.replace(/ /g, "_")}_${equipo.modelo}.pdf`;
        const pdfBlob = doc.output('blob');
        
        if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], nombreArchivo, { type: 'application/pdf' })] })) {
            const archivoCompartir = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });
            navigator.share({
                title: 'Factura TecnoAldy',
                text: `Hola ${cliente}, adjunto tu factura de compra del ${equipo.modelo}. ¡Gracias por confiar en TecnoAldy!`,
                files: [archivoCompartir]
            }).catch(err => console.log('Compartir cancelado.'));
        } else {
            doc.save(nombreArchivo);
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        }
        
    } catch (error) {
        console.error("Error crítico generando el PDF:", error);
        alert("Ocurrió un error creando el PDF. Revisa la consola.");
    }
}