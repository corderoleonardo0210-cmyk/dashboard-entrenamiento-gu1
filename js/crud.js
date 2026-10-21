// ==========================================
// CRUD CON SUPABASE
// ==========================================

const modal = document.getElementById('worker-modal');
const btnAdd = document.getElementById('btn-add-worker');
const btnClose = document.getElementById('close-modal');
const btnCancel = document.getElementById('btn-cancel');
const form = document.getElementById('worker-form');
const modalTitle = document.getElementById('modal-title');

// 1. Abrir/Cerrar Modal
function abrirModal(editar = false, datos = null) {
    modal.classList.add('show');
    if (editar && datos) {
        modalTitle.textContent = "Editar Trabajador";
        document.getElementById('worker-id').value = datos.id;
        document.getElementById('worker-name').value = datos.nombre;
        document.getElementById('worker-position').value = datos.cargo;
        document.getElementById('worker-date').value = datos.fecha_verificacion || '';
        document.getElementById('worker-ingreso').value = datos.fecha_ingreso || '';
    } else {
        modalTitle.textContent = "Agregar Nuevo Trabajador";
        form.reset();
        document.getElementById('worker-id').value = "";
    }
}

function cerrarModal() {
    modal.classList.remove('show');
    form.reset();
}

if (btnAdd) btnAdd.addEventListener('click', () => abrirModal(false));
if (btnClose) btnClose.addEventListener('click', cerrarModal);
if (btnCancel) btnCancel.addEventListener('click', cerrarModal);

// 2. GUARDAR EN SUPABASE
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('worker-id').value;
        const nombre = document.getElementById('worker-name').value;
        const cargo = document.getElementById('worker-position').value;
        const fecha = document.getElementById('worker-date').value;
        const ingreso = document.getElementById('worker-ingreso').value;

        const trabajador = { 
            nombre: nombre, 
            cargo: cargo, 
            fecha_verificacion: fecha || null, 
            fecha_ingreso: ingreso || null 
        };

        try {
            if (id) {
                // EDITAR
                const { error } = await supabaseClient.from('trabajadores').update(trabajador).eq('id', id);
                if (error) throw error;
            } else {
                // CREAR
                const { error } = await supabaseClient.from('trabajadores').insert([trabajador]);
                if (error) throw error;
            }

            cerrarModal();
            alert(`¡Trabajador ${nombre} guardado en la nube!`);
            
            // Recargamos la lista desde Supabase (función que crearemos en app.js)
            if (typeof cargarTrabajadoresDesdeNube === 'function') {
                await cargarTrabajadoresDesdeNube();
            }

        } catch (error) {
            console.error(error);
            alert("Error al guardar: " + error.message);
        }
    });
}

// 3. ABRIR MODAL PARA EDITAR
window.abrirModalEditar = function(id) {
    // Buscamos al trabajador en la lista global que tendremos en app.js
    if (typeof trabajadoresGlobal !== 'undefined') {
        const trabajador = trabajadoresGlobal.find(t => t.id == id);
        if (trabajador) abrirModal(true, trabajador);
    }
};