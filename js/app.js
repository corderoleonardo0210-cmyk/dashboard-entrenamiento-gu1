// ==========================================
// LÓGICA PRINCIPAL CON SUPABASE
// ==========================================

// 1. Variables globales
const cardsGrid = document.getElementById('cards-grid');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
let trabajadoresGlobal = []; // Aquí guardamos los datos de Supabase temporalmente

// 2. Cargar trabajadores desde Supabase
async function cargarTrabajadoresDesdeNube() {
    const { data, error } = await supabaseClient.from('trabajadores').select('*').order('nombre');
    
    if (error) {
        console.error("Error al cargar trabajadores:", error);
        return;
    }
    
    trabajadoresGlobal = data || [];
    renderizarTarjetas(trabajadoresGlobal);
    actualizarKPIs();
}

// 3. Dibujar tarjetas
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

// 4. Filtros y Búsqueda (Buscan en la variable global, no en internet)
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

// 5. KPIs
function actualizarKPIs() {
    if (document.getElementById('kpi-total')) {
        const meta = 35;
        const totalActual = trabajadoresGlobal.length;
        document.getElementById('kpi-total').textContent = `${totalActual}/${meta}`;

        document.getElementById('kpi-entrenantes').textContent = trabajadoresGlobal.filter(t => t.cargo === 'ENTRENANTE').length;
        document.getElementById('kpi-expertos').textContent = trabajadoresGlobal.filter(t => t.cargo === 'EXPERTO').length;
        document.getElementById('kpi-lec').textContent = trabajadoresGlobal.filter(t => t.cargo === 'LEC').length;
        document.getElementById('kpi-entrenadores').textContent = trabajadoresGlobal.filter(t => t.cargo === 'ENTRENADOR').length;
    }
}

// 6. Funciones globales de las tarjetas
window.editarTrabajador = function(id) {
    if (typeof window.abrirModalEditar === 'function') window.abrirModalEditar(id);
};

window.eliminarTrabajador = async function(id) {
    if (confirm("¿Estás seguro de eliminar a este trabajador de la nube?")) {
        const { error } = await supabaseClient.from('trabajadores').delete().eq('id', id);
        
        if (error) {
            alert("Error al eliminar: " + error.message);
            return;
        }
        
        alert("Trabajador eliminado.");
        await cargarTrabajadoresDesdeNube();
    }
};

// 7. Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar datos de la nube al abrir la página
    await cargarTrabajadoresDesdeNube();

    // Lógica para cambiar vistas (Menú lateral)
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
});

// ==========================================
// 8. LÓGICA DEL PERFIL 360 (MODAL CON SUPABASE)
// ==========================================
window.abrirPerfil360 = async function(id) {
    const trabajador = trabajadoresGlobal.find(t => t.id == id);
    if (!trabajador) return;

    // 1. Llenar datos básicos
    document.getElementById('profile-name').textContent = trabajador.nombre;
    
    const badge = document.getElementById('profile-position');
    badge.textContent = trabajador.cargo;
    badge.className = `badge badge-${trabajador.cargo.toLowerCase()}`;

    // 2. Calcular antigüedad
    let fechaIngresoStr = trabajador.fecha_ingreso ? trabajador.fecha_ingreso : "No registrada";
    let antiguedadDias = 0;
    if (trabajador.fecha_ingreso) {
        const fechaIngreso = new Date(trabajador.fecha_ingreso);
        const hoy = new Date();
        const diferenciaTiempo = hoy - fechaIngreso;
        antiguedadDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
    }
    document.getElementById('profile-ingreso').textContent = fechaIngresoStr;
    document.getElementById('profile-antiguedad').textContent = trabajador.fecha_ingreso ? `${antiguedadDias} días` : 'N/A';

    // 3. Cargar Cursos desde Supabase
    const listaCursosContainer = document.getElementById('profile-courses-list');
    listaCursosContainer.innerHTML = '<p>Cargando cursos...</p>';

    // Hacemos la consulta a Supabase
    const { data: cursosDB, error } = await supabaseClient
        .from('progreso_cursos')
        .select('*')
        .eq('trabajador_id', id);

    if (error) {
        console.error(error);
        listaCursosContainer.innerHTML = '<p>Error al cargar cursos.</p>';
        return;
    }

    listaCursosContainer.innerHTML = '';

    if (cursosDB.length === 0) {
        listaCursosContainer.innerHTML = '<p style="color: var(--text-muted);">Este trabajador aún no tiene cursos aprobados.</p>';
    } else {
        cursosDB.forEach(datosCurso => {
            // Solo mostramos los aprobados o verificados
            if (datosCurso.estado !== 'APROBADO' && datosCurso.estado !== 'VERIFICAR') return;

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

    // 4. Guardar BMW y SMS al salir del input (en Supabase)
    listaCursosContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('blur', async () => { 
            const curso = input.getAttribute('data-curso');
            const esBMW = input.classList.contains('obs-bmw');
            const valor = input.value;

            // Actualizamos el campo específico en Supabase
            const campoActualizar = esBMW ? { bmw: valor } : { sms: valor };
            
            const { error } = await supabaseClient
                .from('progreso_cursos')
                .update(campoActualizar)
                .eq('trabajador_id', id)
                .eq('curso', curso);
            
            if (error) console.error("Error al guardar observación", error);
        });
    });

    // 5. Lógica para Imprimir el Perfil 360
    const btnPrintProfile = document.getElementById('btn-print-profile');
    const nuevoBtnPrint = btnPrintProfile.cloneNode(true);
    btnPrintProfile.parentNode.replaceChild(nuevoBtnPrint, btnPrintProfile);

    nuevoBtnPrint.addEventListener('click', () => {
        const nombre = document.getElementById('profile-name').textContent;
        const cargo = document.getElementById('profile-position').textContent;
        const ingreso = document.getElementById('profile-ingreso').textContent;
        const antiguedad = document.getElementById('profile-antiguedad').textContent;
        const courseItems = document.querySelectorAll('.profile-course-item');
        
        let htmlReporte = `
            <div style="font-family: 'Poppins', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #2D3748;">
                <div style="text-align: center; border-bottom: 3px solid #E86B6B; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="margin: 0; color: #E86B6B; font-size: 28px;">Perfil de Entrenamiento 360</h1>
                    <p style="margin: 5px 0 0 0; color: #718096; font-size: 16px;">Restaurante GUI1 - CORCA</p>
                </div>
                <div style="background-color: #F8F9FA; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #E2E8F0;">
                    <h2 style="margin: 0 0 10px 0; font-size: 22px;">${nombre}</h2>
                    <table style="width: 100%; font-size: 14px; color: #4A5568;">
                        <tr>
                            <td style="padding: 5px 0;"><strong>Cargo:</strong> ${cargo}</td>
                            <td style="padding: 5px 0;"><strong>Fecha de Ingreso:</strong> ${ingreso}</td>
                            <td style="padding: 5px 0;"><strong>Antigüedad:</strong> ${antiguedad}</td>
                        </tr>
                    </table>
                </div>
                <h3 style="color: #2D3748; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px;">Cursos Aprobados y Observaciones</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #F8F9FA; border-bottom: 2px solid #E2E8F0;">
                            <th style="padding: 12px; text-align: left; width: 30%;">Curso</th>
                            <th style="padding: 12px; text-align: left; width: 35%;">BMW (Buen Momento Wow)</th>
                            <th style="padding: 12px; text-align: left; width: 35%;">SMS (Sería Mejor Si)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        courseItems.forEach(item => {
            const cursoNombre = item.querySelector('.profile-course-title span').textContent;
            const bmwInput = item.querySelector('.obs-bmw').value || '---';
            const smsInput = item.querySelector('.obs-sms').value || '---';

            htmlReporte += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;"><strong>${cursoNombre}</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #00897B;">${bmwInput}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; color: #A17B00;">${smsInput}</td>
                </tr>
            `;
        });

        htmlReporte += `
                    </tbody>
                </table>
                <div style="margin-top: 60px; display: flex; justify-content: space-between; text-align: center; font-size: 14px;">
                    <div><p style="border-top: 1px solid #2D3748; padding-top: 8px; width: 200px; margin: 0 auto;">Firma del Entrenador</p></div>
                    <div><p style="border-top: 1px solid #2D3748; padding-top: 8px; width: 200px; margin: 0 auto;">Firma del Colaborador</p></div>
                </div>
            </div>
        `;

        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(htmlReporte);
        ventanaImpresion.document.close();
        ventanaImpresion.focus();
        setTimeout(() => { ventanaImpresion.print(); ventanaImpresion.close(); }, 500);
    });

    // 6. Mostrar el modal
    const modal = document.getElementById('profile-modal');
    modal.classList.add('show');
    document.getElementById('close-profile-modal').onclick = () => modal.classList.remove('show');
};

// ==========================================
// 9. MÓDULO DE EVALUACIÓN DE RUTAS (CATÁLOGO)
// ==========================================
const listaCursosEvaluador = [
    "Hospitalidad 1", "Seguridad de la comida", "Hospitalidad 2", "Prevención de Riesgos Laborales",
    "Hospitalidad 3", "Hospitalidad 4", "SRIW - Lugar de trabajo seguro", "Prevención de Violencia",
    "Sesgos Inconscientes", "Cuaderno del Entrenador", "Guía para el coach",
    "Calidad", "Receta del Futuro",
    "Bebidas y Postres", "Lobby y Kiosco", "Mostrador: Pedir y Pagar", "Mostrador: Preparar y Entregar",
    "McDelivery", "AutoMac: Pedir y Pagar", "AutoMac: Preparar y Entregar",
    "Papas Fritas & Hash Browns", "Productos Fritos", "Preparación del menú regular",
    "Preparación de los ingredientes", "Parrilla",
    "Apertura y Cierre", "Desayuno", "McCafé", "Generar buenos momentos", "Crear un ambiente agradable",
    "Materiales adicionales", "Caldosos McDonald's", "Mi prueba de conocimientos",
    "Rediseño del cliente actual", "Rediseño de nuestra visión y ambición", "Rediseño del recorrido del cliente",
    "La hospitalidad en un entorno digital", "Relacionándose con el cliente"
];

document.addEventListener('DOMContentLoaded', () => {
    const selectWorker = document.getElementById('search-worker-route');
    const btnLoad = document.getElementById('btn-load-route');
    const btnSave = document.getElementById('btn-save-route');
    const evaluatorContainer = document.getElementById('route-evaluator-container');
    const coursesListContainer = document.getElementById('evaluator-courses-list');
    const workerNameDisplay = document.getElementById('evaluator-worker-name');
    const filterCargoSelect = document.getElementById('filter-cargo-route');

    // 1. Llenar el select con los trabajadores registrados
    function cargarTrabajadoresEnSelect() {
        if (!selectWorker) return;
        selectWorker.innerHTML = '<option value="">-- Seleccione un trabajador --</option>';
        
        let trabajadores = [...trabajadoresGlobal]; // Usamos la copia global de Supabase
        const cargoFiltro = filterCargoSelect ? filterCargoSelect.value : 'TODOS';

        if (cargoFiltro !== 'TODOS') {
            trabajadores = trabajadores.filter(t => t.cargo === cargoFiltro);
        }

        trabajadores.sort((a,b) => a.nombre.localeCompare(b.nombre));

        trabajadores.forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = t.nombre;
            selectWorker.appendChild(option);
        });
    }

    if (filterCargoSelect) {
        filterCargoSelect.addEventListener('change', () => {
            cargarTrabajadoresEnSelect();
            evaluatorContainer.style.display = 'none'; 
        });
    }

    // Esperamos un momento a que carguen los datos globales de Supabase antes de llenar el select
    setTimeout(cargarTrabajadoresEnSelect, 1000);

    // 2. Cargar Camino desde Supabase
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
                
                const inputFechaHTML = requiereFecha 
                    ? `<input type="date" class="eval-date" data-curso="${curso}" value="${fechaActual}">` 
                    : `<div style="width: 140px;"></div>`;

                row.innerHTML = `
                    <span class="eval-course-name">${curso}</span>
                    <div class="eval-actions-group">
                        <select class="eval-status status-${estadoActual.toLowerCase().replace(/ /g, '-')}" data-curso="${curso}">
                            ${opcionesHTML}
                        </select>
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

    // 3. Guardar Progreso en Supabase
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

            const { error } = await supabaseClient
                .from('progreso_cursos')
                .upsert(cursosParaGuardar, { onConflict: 'trabajador_id, curso' });

            if (error) {
                console.error(error);
                alert("Error al guardar el progreso.");
            } else {
                alert("¡Progreso guardado en la nube con éxito!");
            }
        });
    }
});
