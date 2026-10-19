// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ И LOCALSTORAGE
// ==========================================
let inventory = JSON.parse(localStorage.getItem('hospital_inventory')) || [];
let receipts = JSON.parse(localStorage.getItem('hospital_receipts')) || [];

function saveData() {
    localStorage.setItem('hospital_inventory', JSON.stringify(inventory));
    localStorage.setItem('hospital_receipts', JSON.stringify(receipts));
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

        if (tabId === 'tab-accounting') {
            renderMainTable();
        } else if (tabId === 'tab-receipts') {
            setTodayDate();
        } else if (tabId === 'tab-cartridges') {
            renderCartridgesTab();
        }
    });
});

// ==========================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function getItemQuantity(item) {
    const qty = Number(item.quantity);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function compareInventoryItems(a, b) {
    const nameA = (a.itemName || '').trim().toLowerCase();
    const nameB = (b.itemName || '').trim().toLowerCase();

    if (nameA !== nameB) {
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, 'ru');
    }
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    return idA - idB;
}

function parseInventoryNumber(inv) {
    const s = String(inv || '').trim();
    const match = s.match(/^(.*?)(\d+)$/);
    if (!match) return null;
    return {
        prefix: match[1],
        baseNum: parseInt(match[2], 10),
        padLen: match[2].length
    };
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Синхронизация массива единиц с общим количеством
function ensureUnits(item) {
    if (!item.units) item.units = [];
    const qty = getItemQuantity(item);
    
    while (item.units.length < qty) {
        const i = item.units.length;
        let inv = item.invNumber || '';
        const parsed = parseInventoryNumber(inv);
        
        if (parsed) {
            inv = parsed.prefix + String(parsed.baseNum + i).padStart(parsed.padLen, '0');
        }
        
        item.units.push({
            invNumber: inv,
            location: item.location || '',
            dateTaken: item.dateTaken || '',
            serialNumber: item.serialNumber || ''
        });
    }
    
    if (item.units.length > qty) {
        item.units = item.units.slice(0, qty);
    }
}

window.updateUnitField = function(itemId, unitIndex, field, value) {
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (item && item.units && item.units[unitIndex]) {
        item.units[unitIndex][field] = value;
        saveData(); 
    }
};

window.updateItemField = function(itemId, field, value) {
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (item) {
        item[field] = value;
        saveData();
    }
};

// ==========================================
// 4. ГЛАВНАЯ ТАБЛИЦА (УЧЕТ)
// ==========================================
window.toggleMainDetails = function(id) {
    const detailsRow = document.getElementById(id);
    if (!detailsRow) return;

    const groupRow = detailsRow.previousElementSibling;
    const icon = groupRow ? groupRow.querySelector('.toggle-icon') : null;

    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = '';
        if (icon) icon.textContent = '▼';
    } else {
        detailsRow.style.display = 'none';
        if (icon) icon.textContent = '▶';
    }
};

function renderMainTable(filterText = '') {
    const groupsContainer = document.getElementById('inventoryGroups');
    if (!groupsContainer) return;

    groupsContainer.innerHTML = '';

    const filteredData = inventory.filter(item => {
        const searchStr = `${item.itemName} ${item.invoiceNumber}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    const groupedData = {};
    filteredData.forEach(item => {
        const groupKey = item.invoiceNumber || 'Без накладной (Добавлено вручную)';
        if (!groupedData[groupKey]) groupedData[groupKey] = [];
        groupedData[groupKey].push(item);
    });

    let totalQuantity = 0;

    for (const [groupName, items] of Object.entries(groupedData)) {
        items.sort(compareInventoryItems);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'inventory-group';

        const header = document.createElement('div');
        header.className = 'group-header';
        header.textContent = groupName;
        groupDiv.appendChild(header);

        const table = document.createElement('table');
        table.className = 'group-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 50px;">№</th>
                    <th>Наименование</th>
                    <th style="width: 80px;">Кол-во</th>
                    <th style="width: 100px;">Действия</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        items.forEach((item, index) => {
            const qty = getItemQuantity(item);
            totalQuantity += qty;
            const detailsId = `group-details-${item.id}`;

            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = (e) => {
                if (e.target.closest('button')) return;
                toggleMainDetails(detailsId);
            };

            tr.innerHTML = `
                <td>${index + 1} <span class="toggle-icon">▶</span></td>
                <td>${item.itemName || ''}</td>
                <td>${qty}</td>
                <td>
                    <button class="btn btn-edit" onclick="openEditModal('${item.id}')">✏️</button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);

            ensureUnits(item);
            let unitsHtml = `
                <td colspan="4">
                    <table class="units-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">№</th>
                                <th>Инв. номер</th>
                                <th>Где (Куда)</th>
                                <th>Когда взяли</th>
                                <th>Серийный номер</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            item.units.forEach((u, idx) => {
                unitsHtml += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><input type="text" class="unit-input" value="${u.invNumber || ''}" onchange="updateUnitField('${item.id}', ${idx}, 'invNumber', this.value)"></td>
                        <td><input type="text" class="unit-input" value="${u.location || ''}" onchange="updateUnitField('${item.id}', ${idx}, 'location', this.value)"></td>
                        <td><input type="date" class="unit-input" value="${u.dateTaken || ''}" onchange="updateUnitField('${item.id}', ${idx}, 'dateTaken', this.value)"></td>
                        <td><input type="text" class="unit-input" value="${u.serialNumber || ''}" onchange="updateUnitField('${item.id}', ${idx}, 'serialNumber', this.value)"></td>
                    </tr>
                `;
            });
            unitsHtml += `</tbody></table></td>`;

            const detailsTr = document.createElement('tr');
            detailsTr.id = detailsId;
            detailsTr.className = 'main-details-row';
            detailsTr.style.display = 'none';
            detailsTr.innerHTML = unitsHtml;
            tbody.appendChild(detailsTr);
        });

        groupDiv.appendChild(table);
        groupsContainer.appendChild(groupDiv);
    }

    const totalInfo = document.getElementById('totalQuantityInfo');
    if (totalInfo) {
        totalInfo.textContent = `Всего единиц в текущем списке: ${totalQuantity}`;
    }
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        renderMainTable(e.target.value);
    });
}

// ==========================================
// 5. МОДАЛЬНОЕ ОКНО
// ==========================================
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');

if (document.getElementById('btnAddMainRow')) {
    document.getElementById('btnAddMainRow').addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = 'Добавить запись';
        editForm.reset();
        document.getElementById('editId').value = '';
        modal.style.display = 'block';
    });
}

if (closeModal) closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };

window.openEditModal = function(id) {
    const item = inventory.find(i => String(i.id) === String(id));
    if (!item) return;

    document.getElementById('modalTitle').innerText = 'Редактировать запись';
    document.getElementById('editId').value = item.id;
    document.getElementById('editItemName').value = item.itemName || '';
    document.getElementById('editQuantity').value = item.quantity || 1;
    document.getElementById('editInvoiceNumber').value = item.invoiceNumber || '';

    modal.style.display = 'block';
};

if (editForm) {
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('editId').value;
        const itemData = {
            itemName: document.getElementById('editItemName').value,
            quantity: parseInt(document.getElementById('editQuantity').value) || 1,
            invoiceNumber: document.getElementById('editInvoiceNumber').value
        };

        if (id) {
            const index = inventory.findIndex(i => String(i.id) === String(id));
            if (index !== -1) {
                inventory[index] = { ...inventory[index], ...itemData };
            }
        } else {
            itemData.id = Date.now();
            inventory.push(itemData);
        }

        saveData();
        renderMainTable(searchInput ? searchInput.value : '');
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
        renderMainTable(searchInput ? searchInput.value : '');
        if (document.getElementById('tab-cartridges').classList.contains('active')) {
            renderCartridgesTab();
        }
    }
};

// ==========================================
// 7. КАРТРИДЖИ
// ==========================================
function renderCartridgesTab() {
    const tbody = document.getElementById('cartridgesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchText = (document.getElementById('cartridgeSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('cartridgeStatusFilter')?.value || 'all';

    let flatCartridges = [];
    let countStock = 0;
    let countIssued = 0;

    inventory.forEach(item => {
        const nameLower = (item.itemName || '').toLowerCase();
        if (!nameLower.includes('картридж')) return;

        ensureUnits(item);

        item.units.forEach((u, idx) => {
            const loc = (u.location || '').toLowerCase();
            const isStock = loc.includes('склад') || loc === '';
            const isIssued = !isStock && !loc.includes('спис');

            if (isStock) countStock++;
            else if (isIssued) countIssued++;

            if (statusFilter === 'stock' && !isStock) return;
            if (statusFilter === 'issued' && !isIssued) return;

            const searchStr = `${item.itemName} ${u.invNumber} ${u.serialNumber}`.toLowerCase();
            if (searchText && !searchStr.includes(searchText)) return;

            flatCartridges.push({
                itemId: item.id,
                unitIndex: idx,
                itemName: item.itemName,
                invNumber: u.invNumber,
                serialNumber: u.serialNumber,
                location: u.location,
                dateTaken: u.dateTaken,
                isStock: isStock
            });
        });
    });

    flatCartridges.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ru'));

    flatCartridges.forEach((u, index) => {
        const tr = document.createElement('tr');
        const statusText = u.isStock ? 'На складе' : (u.location || 'Выдан');
        const statusClass = u.isStock ? 'badge-success' : 'badge-warning';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="unit-input" value="${u.itemName || ''}" onchange="updateItemField('${u.itemId}', 'itemName', this.value)"></td>
            <td><input type="text" class="unit-input" value="${u.invNumber || ''}" onchange="updateUnitField('${u.itemId}', ${u.unitIndex}, 'invNumber', this.value)"></td>
            <td><input type="text" class="unit-input" value="${u.serialNumber || ''}" onchange="updateUnitField('${u.itemId}', ${u.unitIndex}, 'serialNumber', this.value)"></td>
            
            <!-- ПОЛЕ ДЛЯ ВЫДАЧИ КАРТРИДЖА -->
            <td>
                <input type="text" class="unit-input" value="${u.location || ''}" placeholder="Склад или Кабинет..." 
                       onchange="updateUnitField('${u.itemId}', ${u.unitIndex}, 'location', this.value); renderCartridgesTab();">
            </td>
            
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td><input type="date" class="unit-input" value="${u.dateTaken || ''}" onchange="updateUnitField('${u.itemId}', ${u.unitIndex}, 'dateTaken', this.value); renderCartridgesTab();"></td>
            <td>
                <button class="btn btn-edit" onclick="openEditModal('${u.itemId}')" title="Изменить кол-во/накладную">✏️</button>
                <button class="btn btn-danger" onclick="deleteCartridgeUnit('${u.itemId}', ${u.unitIndex})" title="Удалить">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const info = document.getElementById('cartridgeInfo');
    if (info) {
        info.textContent = `Всего картриджей: ${countStock + countIssued} | На складе: ${countStock} | Выдано: ${countIssued}`;
    }
}

window.deleteCartridgeUnit = function(itemId, unitIndex) {
    if (!confirm('Удалить этот картридж?')) return;
    const item = inventory.find(i => String(i.id) === String(itemId));
    if (item && item.units) {
        item.units.splice(unitIndex, 1);
        item.quantity = item.units.length; 
        if (item.quantity <= 0) {
            inventory = inventory.filter(i => String(i.id) !== String(itemId));
        }
        saveData();
        renderCartridgesTab();
        renderMainTable(); 
    }
};

const btnAddCartridge = document.getElementById('btnAddCartridge');
if (btnAddCartridge) {
    btnAddCartridge.addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = 'Добавить картридж';
        document.getElementById('editForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('editItemName').value = 'Картридж ';
        document.getElementById('editInvoiceNumber').value = 'Закупка картриджей';
        document.getElementById('editQuantity').value = '1';
        modal.style.display = 'block';
    });
}

const cartSearch = document.getElementById('cartridgeSearchInput');
const cartFilter = document.getElementById('cartridgeStatusFilter');
if (cartSearch) cartSearch.addEventListener('input', renderCartridgesTab);
if (cartFilter) cartFilter.addEventListener('change', renderCartridgesTab);

// Экспорт из вкладки Картриджи
const btnExportCart = document.getElementById('btnExportCartridges');
if (btnExportCart) {
    btnExportCart.addEventListener('click', () => {
        const tbody = document.getElementById('cartridgesTableBody');
        if (!tbody || tbody.querySelectorAll('tr').length === 0) {
            alert('Нет данных для экспорта.');
            return;
        }
        const rows = [['№', 'Наименование', 'Инв. номер', 'Серийный номер', 'Статус (Где)', 'Когда взяли']];
        tbody.querySelectorAll('tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            const invVal = tds[2].querySelector('input')?.value || '';
            const serialVal = tds[3].querySelector('input')?.value || '';
            rows.push([tds[0].textContent, tds[1].querySelector('input').value, invVal, serialVal, tds[4].textContent, tds[5].querySelector('input').value]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Картриджи');
        XLSX.writeFile(wb, `Картриджи_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
    });
}

// ==========================================
// 8. ЭКСПОРТ / ИМПОРТ (ОБЩИЙ)
// ==========================================
if (document.getElementById('btnExportExcel')) {
    document.getElementById('btnExportExcel').addEventListener('click', () => {
        const rows = [['Накладная', '№', 'Наименование', 'Кол-во', 'Инв. номер', 'Где (Куда)', 'Когда взяли', 'Серийный номер']];
        const grouped = {};
        inventory.forEach(item => {
            const g = item.invoiceNumber || 'Без накладной';
            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(item);
        });

        for (const [groupName, items] of Object.entries(grouped)) {
            items.sort(compareInventoryItems);
            items.forEach((item, i) => {
                ensureUnits(item);
                item.units.forEach((u, j) => {
                    rows.push([groupName, `${i + 1}.${j + 1}`, item.itemName, j === 0 ? getItemQuantity(item) : '', u.invNumber || '', u.location || '', formatDate(u.dateTaken), u.serialNumber || '']);
                });
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Учет');
        XLSX.writeFile(wb, `Учет_склада_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
    });
}

if (document.getElementById('btnExportJson')) {
    document.getElementById('btnExportJson').addEventListener('click', () => {
        const dataStr = JSON.stringify({ inventory, receipts }, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
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
                if (data.inventory && data.receipts) {
                    inventory = data.inventory;
                    receipts = data.receipts;
                    saveData();
                    renderMainTable();
                    renderCartridgesTab();
                    alert('Данные успешно загружены!');
                } else {
                    alert('Неверный формат файла!');
                }
            } catch (err) {
                alert('Ошибка при чтении файла: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}

// ==========================================
// 10. ЗАЯВКА
// ==========================================
window.addApplicationRow = function() {
    const tbody = document.getElementById('app-table-body');
    const totalRow = document.getElementById('app-total-row');
    if (!tbody || !totalRow) return;
    
    const rowCount = tbody.querySelectorAll('tr:not(#app-total-row)').length + 1;
    const tr = document.createElement('tr');
    tr.className = 'app-data-row';
    tr.innerHTML = `
        <td class="row-num">${rowCount}</td>
        <td>Заправка/ремонт</td>
        <td><input type="text" class="app-tech-name" placeholder="Введите технику (напр. Принтер HP)" style="text-align: center;"></td>
        <td><input type="number" class="app-qty" min="1" value="1" onchange="updateAppTotal()" oninput="updateAppTotal()"></td>
        <td><input type="text" class="app-date" placeholder="Дата и время"></td>
        <td><input type="text" class="app-note" placeholder="Примечание"></td>
        <td class="no-print" style="border: none; padding-left: 10px;">
            <button class="btn btn-danger" onclick="deleteAppRow(this)" style="padding: 2px 6px; font-size: 12px;">❌</button>
        </td>
    `;
    tbody.insertBefore(tr, totalRow);
    updateAppTotal();
};

window.deleteAppRow = function(btn) {
    btn.closest('tr').remove();
    updateAppRowNumbers();
    updateAppTotal();
};

function updateAppRowNumbers() {
    document.querySelectorAll('.app-data-row').forEach((row, index) => {
        row.querySelector('.row-num').textContent = index + 1;
    });
}

window.clearApplicationRows = function() {
    if (confirm('Очистить заявку?')) {
        document.querySelectorAll('.app-data-row').forEach(row => row.remove());
        addApplicationRow();
    }
};

function updateAppTotal() {
    let total = 0;
    document.querySelectorAll('.app-qty').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const totalField = document.querySelector('.app-total-qty');
    if (totalField) totalField.value = total;
}

// ==========================================
// 11. ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-table-body') && document.querySelectorAll('.app-data-row').length === 0) {
        addApplicationRow();
    }
    renderMainTable();
    setTodayDate();
});