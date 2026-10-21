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