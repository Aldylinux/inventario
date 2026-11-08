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
// Llenar el buscador de la pestaña FACTURAS
    const listaImeisVentas = document.getElementById('lista-imeis-ventas');
    if (listaImeisVentas) {
        listaImeisVentas.innerHTML = '';
        ventas.forEach(venta => {
            listaImeisVentas.innerHTML += `<option value="${venta.imei}">${venta.modelo}</option>`;
        });
    }
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
// ==========================================
// 9. MÓDULO DE FACTURACIÓN (PDF A CLIENTES)
// ==========================================
let equipoVendidoEncontrado = null;

// Buscador de IMEI en la pestaña de facturas
const inputBuscarFactura = document.getElementById('buscar_imei_factura');
if (inputBuscarFactura) {
    inputBuscarFactura.addEventListener('input', function(e) {
        const valorInput = e.target.value;
        // Busca en el array de VENTAS (los que ya salieron)
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

// Botón de Generar Factura
const formFactura = document.getElementById('form-factura');
if (formFactura) {
    formFactura.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!equipoVendidoEncontrado) return;

        const nombre = document.getElementById('cliente_nombre').value.toUpperCase();
        const cedula = document.getElementById('cliente_cedula').value;
        const telefono = document.getElementById('cliente_telefono').value;

        generarFacturaClientePDF(equipoVendidoEncontrado, nombre, cedula, telefono);
        
        this.reset();
        document.getElementById('info-equipo-factura').style.display = 'none';
        document.getElementById('btn-generar-factura').disabled = true;
        equipoVendidoEncontrado = null;
    });
}

function generarFacturaClientePDF(equipo, cliente, cedula, telefono) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Formato Carta/A4 Vertical

    // Generar un número de factura basado en la fecha (Ej: FAC-172554)
    const numeroFactura = "FAC-" + Math.floor(Date.now() / 10000).toString(); 

    // --- ENCABEZADO DEL LOCAL ---
    doc.setFontSize(22);
    doc.setTextColor(255, 102, 0); // Naranja TecnoAldy
    doc.text("TECNOALDY", 105, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("NIT: 24728906-0", 105, 24, { align: 'center' });
    doc.text("Cra 7 # 7-37 Camellón, Fresno - Tolima", 105, 29, { align: 'center' });
    doc.text("Tel: 302 736 4763", 105, 34, { align: 'center' });

    // --- DATOS DE LA FACTURA ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`FACTURA DE VENTA: ${numeroFactura}`, 14, 45);
    doc.text(`FECHA DE COMPRA: ${equipo.fecha_hora_venta}`, 14, 52);

    // --- DATOS DEL CLIENTE ---
    doc.setDrawColor(255, 102, 0);
    doc.setLineWidth(0.5);
    doc.line(14, 57, 196, 57); // Línea naranja divisoria
    
    doc.setFontSize(11);
    doc.text("DATOS DEL CLIENTE:", 14, 65);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Nombre: ${cliente}`, 14, 72);
    doc.text(`C.C / NIT: ${cedula}`, 14, 78);
    doc.text(`Teléfono: ${telefono}`, 14, 84);

    // --- DETALLE DEL EQUIPO (TABLA) ---
    doc.autoTable({
        startY: 92,
        head: [["Cant.", "Descripción del Equipo", "IMEI", "Plataforma", "Valor Total"]],
        body: [
            ["1", equipo.modelo, equipo.imei, equipo.plataforma || 'Contado', formatCOP(equipo.precio_venta)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [255, 102, 0] },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    // --- TÉRMINOS DE GARANTÍA ---
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(220, 53, 69); // Rojo para la advertencia
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
    terminos.forEach(linea => {
        doc.text(linea, 14, yPos);
        yPos += 5;
    });

    // --- FIRMAS AUTO-LLENADAS ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    
    // Firma TecnoAldy (Izquierda)
    doc.line(20, yPos + 30, 80, yPos + 30);
    doc.setFontSize(10);
    doc.text("Firma Vendedor Autorizado", 50, yPos + 35, { align: 'center' });
    doc.text("TECNOALDY", 50, yPos + 40, { align: 'center' });

    // Firma Cliente (Derecha - AUTO-LLENADA)
    doc.line(130, yPos + 30, 190, yPos + 30);
    doc.text("Firma Cliente / Comprador", 160, yPos + 35, { align: 'center' });
    doc.setFontType("bold");
    doc.text(cliente, 160, yPos + 40, { align: 'center' }); // Pone el nombre automático
    doc.setFontType("normal");
    doc.text(`C.C: ${cedula}`, 160, yPos + 45, { align: 'center' }); // Pone la cédula automática

    // Descargar
    doc.save(`Factura_${cliente.replace(/ /g, "_")}_${equipo.modelo}.pdf`);
}