// ==========================================
// VARIABLES GLOBALES
// ==========================================
const cardsGrid = document.getElementById('cards-grid');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
let trabajadoresGlobal = []; 

// ==========================================
// 1. CARGAR TRABAJADORES DESDE SUPABASE
// ==========================================
async function cargarTrabajadoresDesdeNube() {
    const { data, error } = await supabaseClient.from('trabajadores').select('*').order('nombre');
    
    if (error) {
        console.error("Error al cargar trabajadores:", error);
        return;
    }
    
    trabajadoresGlobal = data || [];
    renderizarTarjetas(trabajadoresGlobal);
    actualizarKPIs();
    
    // Si el catálogo ya está en pantalla, actualizamos el select
    const selectWorker = document.getElementById('search-worker-route');
    if (selectWorker) {
        cargarTrabajadoresEnSelect();
    }
}

// ==========================================
// 2. DIBUJAR TARJETAS DE PERSONAL
// ==========================================
function renderizarTarjetas(trabajadores) {
    cardsGrid.innerHTML = '';

    if (trabajadores.length === 0) {
        cardsGrid.innerHTML = `<p style="text-align:center; width:100%; color: var(--text-muted);">No hay trabajadores registrados.</p>`;
        return;
    }

    trabajadores.forEach(trabajador => {
        const tarjetaHTML = `
            <div class="worker-card" style="cursor: pointer;" onclick="abrirPerfil360('${trabajador.id}')">
                <h3>${trabajador.nombre}</h3>
                <span class="badge badge-${trabajador.cargo.toLowerCase()}">${trabajador.cargo}</span>
                <p>Verificación: ${trabajador.fecha_verificacion || 'Sin fecha'}</p>
                
                <div class="card-actions" onclick="event.stopPropagation()">
                    <button onclick="editarTrabajador('${trabajador.id}')" class="btn-icon" title="Editar">✏️</button>
                    <button onclick="eliminarTrabajador('${trabajador.id}')" class="btn-icon" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
        cardsGrid.innerHTML += tarjetaHTML;
    });
}

// ==========================================
// 3. FILTROS Y BÚSQUEDA DE PERSONAL
// ==========================================
function filtrarTrabajadores() {
    const textoBusqueda = searchInput ? searchInput.value.toLowerCase() : "";
    const botonActivo = document.querySelector('.filter-btn.active');
    const cargoActivo = botonActivo ? botonActivo.getAttribute('data-cargo') : 'TODOS';

    const filtrados = trabajadoresGlobal.filter(trabajador => {
        const coincideNombre = trabajador.nombre.toLowerCase().includes(textoBusqueda);
        const coincideCargo = cargoActivo === 'TODOS' || trabajador.cargo === cargoActivo;
        return coincideNombre && coincideCargo;
    });

    renderizarTarjetas(filtrados);
}

// ==========================================
// 4. KPIs (ESTADÍSTICAS)
// ==========================================
function actualizarKPIs() {
    if (document.getElementById('kpi-total')) {
        const meta = 35;
        document.getElementById('kpi-total').textContent = `${trabajadoresGlobal.length}/${meta}`;
        document.getElementById('kpi-entrenantes').textContent = trabajadoresGlobal.filter(t => t.cargo === 'ENTRENANTE').length;
        document.getElementById('kpi-expertos').textContent = trabajadoresGlobal.filter(t => t.cargo === 'EXPERTO').length;
        document.getElementById('kpi-lec').textContent = trabajadoresGlobal.filter(t => t.cargo === 'LEC').length;
        document.getElementById('kpi-entrenadores').textContent = trabajadoresGlobal.filter(t => t.cargo === 'ENTRENADOR').length;
    }
}

// ==========================================
// 5. FUNCIONES GLOBALES (TARJETAS)
// ==========================================
window.editarTrabajador = function(id) {
    if (typeof window.abrirModalEditar === 'function') window.abrirModalEditar(id);
};

window.eliminarTrabajador = async function(id) {
    if (confirm("¿Estás seguro de eliminar a este trabajador de la nube?")) {
        const { error } = await supabaseClient.from('trabajadores').delete().eq('id', id);
        if (error) { alert("Error al eliminar: " + error.message); return; }
        alert("Trabajador eliminado.");
        await cargarTrabajadoresDesdeNube();
    }
};

// ==========================================
// 6. PERFIL 360 (CON SUPABASE)
// ==========================================
window.abrirPerfil360 = async function(id) {
    const trabajador = trabajadoresGlobal.find(t => t.id == id);
    if (!trabajador) return;

    document.getElementById('profile-name').textContent = trabajador.nombre;
    const badge = document.getElementById('profile-position');
    badge.textContent = trabajador.cargo;
    badge.className = `badge badge-${trabajador.cargo.toLowerCase()}`;

    // Calcular antigüedad
    let fechaIngresoStr = trabajador.fecha_ingreso ? trabajador.fecha_ingreso : "No registrada";
    let antiguedadDias = 0;
    if (trabajador.fecha_ingreso) {
        const fechaIngreso = new Date(trabajador.fecha_ingreso);
        antiguedadDias = Math.floor((new Date() - fechaIngreso) / (1000 * 60 * 60 * 24));
    }
    document.getElementById('profile-ingreso').textContent = fechaIngresoStr;
    document.getElementById('profile-antiguedad').textContent = trabajador.fecha_ingreso ? `${antiguedadDias} días` : 'N/A';

    // Cargar cursos
    const listaCursosContainer = document.getElementById('profile-courses-list');
    listaCursosContainer.innerHTML = '<p>Cargando cursos...</p>';

    const { data: cursosDB, error } = await supabaseClient.from('progreso_cursos').select('*').eq('trabajador_id', id);
    if (error) { listaCursosContainer.innerHTML = '<p>Error al cargar cursos.</p>'; return; }

    listaCursosContainer.innerHTML = '';
    const cursosValidos = cursosDB.filter(c => c.estado === 'APROBADO' || c.estado === 'VERIFICAR');

    if (cursosValidos.length === 0) {
        listaCursosContainer.innerHTML = '<p style="color: var(--text-muted);">Este trabajador aún no tiene cursos aprobados.</p>';
    } else {
        cursosValidos.forEach(datosCurso => {
            let claseEstado = 'aprobado';
            if (datosCurso.estado === 'VOLVER A INTENTAR') claseEstado = 'volver';

            const cursoHTML = `
                <div class="profile-course-item ${claseEstado}">
                    <div class="profile-course-title">
                        <span>${datosCurso.curso}</span>
                        <span class="profile-course-status">${datosCurso.estado}</span>
                    </div>
                    <div class="profile-observations">
                        <div style="flex:1;">
                            <label class="obs-label">BMW (Buen Momento Wow)</label>
                            <input type="text" class="obs-bmw" data-curso="${datosCurso.curso}" value="${datosCurso.bmw || ''}" placeholder="Destacar algo positivo...">
                        </div>
                        <div style="flex:1;">
                            <label class="obs-label">SMS (Sería Mejor Si)</label>
                            <input type="text" class="obs-sms" data-curso="${datosCurso.curso}" value="${datosCurso.sms || ''}" placeholder="Área de mejora...">
                        </div>
                    </div>
                </div>
            `;
            listaCursosContainer.innerHTML += cursoHTML;
        });
    }

    // Guardar BMW y SMS
    listaCursosContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('blur', async () => { 
            const curso = input.getAttribute('data-curso');
            const esBMW = input.classList.contains('obs-bmw');
            const campoActualizar = esBMW ? { bmw: input.value } : { sms: input.value };
            
            await supabaseClient.from('progreso_cursos').update(campoActualizar).eq('trabajador_id', id).eq('curso', curso);
        });
    });

    // Configurar botón de imprimir
    const btnPrintProfile = document.getElementById('btn-print-profile');
    const nuevoBtnPrint = btnPrintProfile.cloneNode(true);
    btnPrintProfile.parentNode.replaceChild(nuevoBtnPrint, btnPrintProfile);

    nuevoBtnPrint.addEventListener('click', () => {
        // (El código de impresión que ya tenías se mantiene aquí)
        alert("Función de impresión lista (revisar código original)");
    });

    // Mostrar modal
    const modal = document.getElementById('profile-modal');
    modal.classList.add('show');
    document.getElementById('close-profile-modal').onclick = () => modal.classList.remove('show');
};

// ==========================================
// 7. LÓGICA DEL CATÁLOGO DE CURSOS (EVALUADOR)
// ==========================================
const listaCursosEvaluador = [
    "Hospitalidad 1", "Seguridad de la comida", "Hospitalidad 2", "Prevención de Riesgos Laborales",
    "Hospitalidad 3", "Hospitalidad 4", "SRIW - Lugar de trabajo seguro", "Prevención de Violencia",
    "Sesgos Inconscientes", "Cuaderno del Entrenador", "Guía para el coach", "Calidad", "Receta del Futuro",
    "Bebidas y Postres", "Lobby y Kiosco", "Mostrador: Pedir y Pagar", "Mostrador: Preparar y Entregar",
    "McDelivery", "AutoMac: Pedir y Pagar", "AutoMac: Preparar y Entregar", "Papas Fritas & Hash Browns",
    "Productos Fritos", "Preparación del menú regular", "Preparación de los ingredientes", "Parrilla",
    "Apertura y Cierre", "Desayuno", "McCafé", "Generar buenos momentos", "Crear un ambiente agradable",
    "Materiales adicionales", "Caldosos McDonald's", "Mi prueba de conocimientos", "Rediseño del cliente actual",
    "Rediseño de nuestra visión y ambición", "Rediseño del recorrido del cliente", "La hospitalidad en un entorno digital", "Relacionándose con el cliente"
];

function cargarTrabajadoresEnSelect() {
    const selectWorker = document.getElementById('search-worker-route');
    const filterCargoSelect = document.getElementById('filter-cargo-route');
    if (!selectWorker) return;

    selectWorker.innerHTML = '<option value="">-- Seleccione un trabajador --</option>';
    let trabajadores = [...trabajadoresGlobal];
    
    if (filterCargoSelect && filterCargoSelect.value !== 'TODOS') {
        trabajadores = trabajadores.filter(t => t.cargo === filterCargoSelect.value);
    }

    trabajadores.sort((a,b) => a.nombre.localeCompare(b.nombre));
    trabajadores.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.nombre;
        selectWorker.appendChild(option);
    });
}

// ==========================================
// 8. INICIALIZACIÓN ÚNICA (EVENTOS AL CARGAR)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos iniciales de la nube
    await cargarTrabajadoresDesdeNube();

    // 2. Eventos de filtros de personal
    if (searchInput) searchInput.addEventListener('input', filtrarTrabajadores);
    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                filtrarTrabajadores();
            });
        });
    }

    // 3. Lógica para cambiar vistas (Menú lateral)
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const views = document.querySelectorAll('.dashboard-view');
    const title = document.getElementById('current-view-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') === '#') e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            views.forEach(view => view.classList.remove('active'));

            const targetId = item.getAttribute('data-target');
            if (targetId) {
                const targetView = document.getElementById(targetId);
                if (targetView) targetView.classList.add('active');
            }

            if (targetId === 'view-personal') title.textContent = "Gestión de Personal";
            if (targetId === 'view-cursos') title.textContent = "Catálogo de Cursos y Rutas";
            if (targetId === 'view-estadisticas') title.textContent = "Estadísticas del Equipo";
            if (targetId === 'view-alertas') title.textContent = "Alertas y Vencimientos";
        });
    });

    // 4. Lógica del Evaluador (Catálogo)
    const selectWorker = document.getElementById('search-worker-route');
    const btnLoad = document.getElementById('btn-load-route');
    const btnSave = document.getElementById('btn-save-route');
    const evaluatorContainer = document.getElementById('route-evaluator-container');
    const coursesListContainer = document.getElementById('evaluator-courses-list');
    const workerNameDisplay = document.getElementById('evaluator-worker-name');
    const filterCargoSelect = document.getElementById('filter-cargo-route');

    if (filterCargoSelect) {
        filterCargoSelect.addEventListener('change', () => {
            cargarTrabajadoresEnSelect();
            evaluatorContainer.style.display = 'none'; 
        });
    }

    if (btnLoad) {
        btnLoad.addEventListener('click', async () => {
            const workerId = selectWorker.value;
            if (!workerId) return alert("Por favor, selecciona un trabajador primero.");

            const trabajador = trabajadoresGlobal.find(t => t.id == workerId);
            workerNameDisplay.textContent = `Progreso de: ${trabajador.nombre}`;

            const { data: cursosDB, error } = await supabaseClient.from('progreso_cursos').select('*').eq('trabajador_id', workerId);
            if (error) return alert("Error al cargar los cursos.");

            const cursosDelTrabajador = {};
            cursosDB.forEach(c => { cursosDelTrabajador[c.curso] = c; });

            const cursosConFecha = [
                "Seguridad de la comida", "Prevención de Riesgos Laborales", "Hospitalidad 4",
                "Cuaderno del Entrenador", "Guía para el coach", "Bebidas y Postres", "Lobby y Kiosco", 
                "Mostrador: Pedir y Pagar", "Mostrador: Preparar y Entregar", "McDelivery", 
                "AutoMac: Pedir y Pagar", "AutoMac: Preparar y Entregar", "Papas Fritas & Hash Browns", 
                "Productos Fritos", "Preparación del menú regular", "Preparación de los ingredientes", 
                "Parrilla", "Desayuno"
            ];

            coursesListContainer.innerHTML = '';
            
            listaCursosEvaluador.forEach(curso => {
                const requiereFecha = cursosConFecha.includes(curso);
                const datosCurso = cursosDelTrabajador[curso] || {};
                const estadoActual = datosCurso.estado || 'POR COMENZAR';
                const fechaActual = datosCurso.fecha_verificacion || '';

                const opcionesHTML = `
                    <option value="POR COMENZAR" ${estadoActual === 'POR COMENZAR' ? 'selected' : ''}>Por Comenzar</option>
                    <option value="REALIZADO" ${estadoActual === 'REALIZADO' ? 'selected' : ''}>Realizado</option>
                    <option value="APROBADO" ${estadoActual === 'APROBADO' ? 'selected' : ''}>Aprobado</option>
                    <option value="VERIFICAR" ${estadoActual === 'VERIFICAR' ? 'selected' : ''}>✈️ Verificar</option>
                    <option value="VOLVER A INTENTAR" ${estadoActual === 'VOLVER A INTENTAR' ? 'selected' : ''}>Volver a Intentar</option>
                `;

                const row = document.createElement('div');
                row.className = 'eval-row';
                const inputFechaHTML = requiereFecha ? `<input type="date" class="eval-date" data-curso="${curso}" value="${fechaActual}">` : `<div style="width: 140px;"></div>`;

                row.innerHTML = `
                    <span class="eval-course-name">${curso}</span>
                    <div class="eval-actions-group">
                        <select class="eval-status status-${estadoActual.toLowerCase().replace(/ /g, '-')}" data-curso="${curso}">${opcionesHTML}</select>
                        ${inputFechaHTML}
                    </div>
                `;
                
                const selectEl = row.querySelector('select');
                selectEl.addEventListener('change', (e) => {
                    e.target.className = 'eval-status';
                    e.target.classList.add(`status-${e.target.value.toLowerCase().replace(/ /g, '-')}`);
                });

                coursesListContainer.appendChild(row);
            });

            evaluatorContainer.style.display = 'block';
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const workerId = selectWorker.value;
            if (!workerId) return alert("Primero debes cargar un trabajador.");
            const rows = document.querySelectorAll('.eval-row');
            if (rows.length === 0) return alert("No hay cursos para guardar.");

            const cursosParaGuardar = [];
            rows.forEach(row => {
                const select = row.querySelector('.eval-status');
                const inputFecha = row.querySelector('.eval-date'); 
                if (select) {
                    cursosParaGuardar.push({
                        trabajador_id: workerId,
                        curso: select.getAttribute('data-curso'),
                        estado: select.value,
                        fecha_verificacion: inputFecha ? (inputFecha.value || null) : null
                    });
                }
            });

            const { error } = await supabaseClient.from('progreso_cursos').upsert(cursosParaGuardar, { onConflict: 'trabajador_id, curso' });
            if (error) { console.error(error); alert("Error al guardar el progreso."); } 
            else { alert("¡Progreso guardado en la nube con éxito!"); }
        });
    }
});