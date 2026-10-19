// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ И LOCALSTORAGE
// ==========================================
let inventory = JSON.parse(localStorage.getItem('hospital_inventory')) || [];

function saveData() {
    localStorage.setItem('hospital_inventory', JSON.stringify(inventory));
}

function isCartridgeItem(item) {
    return item.isCartridge === true || (item.itemName || '').toLowerCase().includes('картридж');
}

// ==========================================
// 2. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        const tabSection = document.getElementById(tabId);
        if (tabSection) tabSection.classList.add('active');

        if (tabId === 'tab-cartridges') renderCartridgesTab();
    });
});

// ==========================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function getItemQuantity(item) {
    const qty = Number(item.quantity);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

window.updateItemField = function(itemId, field, value) {
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (item) {
        item[field] = value;
        saveData();
    }
};

window.updateItemQuantity = function(itemId, value) {
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (item) {
        item.quantity = parseInt(value) || 1;
        saveData();
        renderCartridgesTab();
    }
};

// ==========================================
// 4. МОДАЛЬНОЕ ОКНО
// ==========================================
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');

if (closeModal) closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };

window.openEditModal = function(id) {
    const item = inventory.find(i => String(i.id) === String(id));
    if (!item) return;

    document.getElementById('modalTitle').innerText = 'Редактировать картридж';
    document.getElementById('editId').value = item.id;
    document.getElementById('editItemName').value = item.itemName || '';
    document.getElementById('editQuantity').value = item.quantity || 1;
    modal.style.display = 'block';
};

if (editForm) {
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        
        const qtyInput = parseInt(document.getElementById('editQuantity').value) || 1;
        
        const itemData = {
            itemName: document.getElementById('editItemName').value,
            quantity: qtyInput,
            isCartridge: true
        };

        if (id) {
            const index = inventory.findIndex(i => String(i.id) === String(id));
            if (index !== -1) inventory[index] = { ...inventory[index], ...itemData };
        } else {
            itemData.id = Date.now();
            inventory.push(itemData);
            
            // АВТОМАТИЧЕСКИ ОТПРАВЛЯЕМ В ЗАЯВКУ С УКАЗАННЫМ КОЛИЧЕСТВОМ
            addApplicationRow({ 
                name: itemData.itemName, 
                note: 'Заправка', 
                itemId: itemData.id,
                qty: qtyInput // Передаем количество
            });
        }

        saveData();
        if (document.getElementById('tab-cartridges').classList.contains('active')) {
            renderCartridgesTab();
        }
        modal.style.display = 'none';
    });
}

window.deleteItem = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        inventory = inventory.filter(item => String(item.id) !== String(id));
        saveData();
        renderCartridgesTab();
    }
};

// ==========================================
// 5. ВКЛАДКА КАРТРИДЖИ
// ==========================================
function renderCartridgesTab() {
    const tbody = document.getElementById('cartridgesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchText = (document.getElementById('cartridgeSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('cartridgeStatusFilter')?.value || 'all';

    let cartridges = inventory.filter(item => isCartridgeItem(item));
    let countStock = 0;
    let countIssued = 0;
    let totalUnits = 0;

    cartridges.forEach(item => {
        const qty = getItemQuantity(item);
        totalUnits += qty;
        const loc = (item.location || '').toLowerCase();
        const isStock = loc.includes('склад') || loc === '';
        if (isStock) countStock += qty;
        else countIssued += qty;
    });

    cartridges = cartridges.filter(item => {
        const loc = (item.location || '').toLowerCase();
        const isStock = loc.includes('склад') || loc === '';
        if (statusFilter === 'stock' && !isStock) return false;
        if (statusFilter === 'issued' && isStock) return false;
        const searchStr = `${item.itemName} ${item.invNumber} ${item.serialNumber}`.toLowerCase();
        if (searchText && !searchStr.includes(searchText)) return false;
        return true;
    });

    cartridges.forEach((item, index) => {
        const tr = document.createElement('tr');
        const loc = item.location || '';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="unit-input" value="${item.itemName || ''}" onchange="updateItemField('${item.id}', 'itemName', this.value)"></td>
            <td><input type="number" class="unit-input" min="1" value="${getItemQuantity(item)}" onchange="updateItemQuantity('${item.id}', this.value)"></td>
            <td><input type="text" class="unit-input" value="${loc}" placeholder="Склад или Кабинет..." onchange="updateItemField('${item.id}', 'location', this.value); renderCartridgesTab();"></td>
            <td><input type="date" class="unit-input" value="${item.dateTaken || ''}" onchange="updateItemField('${item.id}', 'dateTaken', this.value); renderCartridgesTab();"></td>
            <td>
                <button class="btn btn-primary" onclick="sendToApplication('${item.id}')" title="Добавить в заявку" style="padding: 4px 8px; font-size: 14px;">📝</button>
                <button class="btn btn-edit" onclick="openEditModal('${item.id}')" title="Изменить" style="padding: 4px 8px; font-size: 14px;">✏️</button>
                <button class="btn btn-danger" onclick="deleteItem('${item.id}')" title="Удалить" style="padding: 4px 8px; font-size: 14px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const info = document.getElementById('cartridgeInfo');
    if (info) info.textContent = `Всего картриджей: ${totalUnits} шт.`;
}

const btnAddCartridge = document.getElementById('btnAddCartridge');
if (btnAddCartridge) {
    btnAddCartridge.addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = 'Добавить картридж';
        document.getElementById('editForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('editItemName').value = 'Картридж ';
        document.getElementById('editQuantity').value = '1';
        modal.style.display = 'block';
    });
}

const cartSearch = document.getElementById('cartridgeSearchInput');
const cartFilter = document.getElementById('cartridgeStatusFilter');
if (cartSearch) cartSearch.addEventListener('input', renderCartridgesTab);
if (cartFilter) cartFilter.addEventListener('change', renderCartridgesTab);

// Экспорт
const btnExportCart = document.getElementById('btnExportCartridges');
if (btnExportCart) {
    btnExportCart.addEventListener('click', () => {
        const tbody = document.getElementById('cartridgesTableBody');
        if (!tbody || tbody.querySelectorAll('tr').length === 0) return alert('Нет данных для экспорта.');
        
        const rows = [['№', 'Наименование', 'Количество', 'Где (Куда)', 'Когда взяли']];
        tbody.querySelectorAll('tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            rows.push([
                tds[0].textContent, 
                tds[1].querySelector('input').value, 
                tds[2].querySelector('input').value, 
                tds[3].querySelector('input').value, 
                tds[4].querySelector('input').value
            ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Картриджи');
        XLSX.writeFile(wb, `Картриджи_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
    });
}

// ==========================================
// 6. ЭКСПОРТ / ИМПОРТ JSON
// ==========================================
if (document.getElementById('btnExportJson')) {
    document.getElementById('btnExportJson').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify({ inventory }, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_sklad_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    });
}

if (document.getElementById('importJson')) {
    document.getElementById('importJson').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.inventory) {
                    inventory = data.inventory;
                    saveData();
                    renderCartridgesTab();
                    alert('Данные загружены!');
                }
            } catch (err) { alert('Ошибка: ' + err.message); }
        };
        reader.readAsText(file);
    });
}

// ==========================================
// 7. ЗАЯВКА НА РЕМОНТ
// ==========================================
window.addApplicationRow = function(data = null) {
    const tbody = document.getElementById('app-table-body');
    const totalRow = document.getElementById('app-total-row');
    if (!tbody || !totalRow) return;
    
    const itemId = data && data.itemId ? data.itemId : '';
    if (itemId && tbody.querySelector(`tr[data-item-id="${itemId}"]`)) return; 

    const rowCount = tbody.querySelectorAll('tr:not(#app-total-row)').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'app-data-row';
    if (itemId) tr.setAttribute('data-item-id', itemId);

    const techName = data && data.name ? data.name : '';
    const note = data && data.note ? data.note : '';
    const qty = data && data.qty ? data.qty : 1; // Берем переданное количество

    tr.innerHTML = `
        <td class="row-num">${rowCount}</td>
        <td>Заправка/ремонт</td>
        <td><input type="text" class="app-tech-name" value="${techName}" placeholder="Введите технику" style="text-align: center;"></td>
        <td><input type="number" class="app-qty" min="1" value="${qty}" onchange="updateAppTotal()" oninput="updateAppTotal()"></td>
        <td><input type="text" class="app-date" placeholder="Дата и время"></td>
        <td><input type="text" class="app-note" value="${note}" placeholder="Примечание"></td>
        <td class="no-print" style="border: none; padding-left: 10px;"><button class="btn btn-danger" onclick="deleteAppRow(this)" style="padding: 2px 6px; font-size: 12px;">❌</button></td>
    `;
    tbody.insertBefore(tr, totalRow);
    updateAppTotal();
};

window.deleteAppRow = function(btn) {
    btn.closest('tr').remove();
    document.querySelectorAll('.app-data-row').forEach((row, index) => row.querySelector('.row-num').textContent = index + 1);
    updateAppTotal();
};

window.clearApplicationRows = function() {
    if (confirm('Очистить заявку?')) {
        document.querySelectorAll('.app-data-row').forEach(row => row.remove());
        addApplicationRow();
    }
};

window.sendToApplication = function(itemId) {
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const appTabBtn = document.querySelector('[data-tab="tab-application"]');
    if (appTabBtn) appTabBtn.click();

    addApplicationRow({ 
        name: item.itemName, 
        note: 'Заправка', 
        itemId: item.id,
        qty: getItemQuantity(item) // Передаем текущее количество из базы
    });
};

function updateAppTotal() {
    let total = 0;
    document.querySelectorAll('.app-qty').forEach(input => total += parseInt(input.value) || 0);
    const totalField = document.querySelector('.app-total-qty');
    if (totalField) totalField.value = total;
}

// ==========================================
// 8. ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-table-body') && document.querySelectorAll('.app-data-row').length === 0) {
        addApplicationRow();
    }
    renderCartridgesTab();
});