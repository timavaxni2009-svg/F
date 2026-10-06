// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ ДАННЫХ И LOCALSTORAGE
// ==========================================
let inventory = JSON.parse(localStorage.getItem('hospital_inventory')) || [];
let receipts = JSON.parse(localStorage.getItem('hospital_receipts')) || [];

// Функция сохранения данных в LocalStorage
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
        document.getElementById(e.target.dataset.tab).classList.add('active');
        
        if (e.target.dataset.tab === 'tab-accounting') {
            renderMainTable();
        }
        
        // НОВОЕ: Устанавливаем текущую дату при переходе на вкладку прихода
        if (e.target.dataset.tab === 'tab-receipts') {
            setTodayDate();
        }
    });
});

// ==========================================
// 3. РАБОТА С ГЛАВНОЙ ТАБЛИЦЕЙ (УЧЕТ)
// ==========================================
const mainTableBody = document.getElementById('mainTableBody');
const searchInput = document.getElementById('searchInput');

// Отрисовка таблицы
function renderMainTable(filterText = '') {
    mainTableBody.innerHTML = '';
    
    const filteredData = inventory.filter(item => {
        const searchStr = `${item.itemName} ${item.location} ${item.serialNumber} ${item.invNumber}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    filteredData.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.itemName || ''}</td>
            <td>${item.location || ''}</td>
            <td>${formatDate(item.dateTaken)}</td>
            <td>${formatDate(item.dateImplemented)}</td>
            <td>${item.invNumber || ''}</td>
            <td>${item.invoiceNumber || ''}</td>
            <td>${item.serialNumber || ''}</td>
            <td>
                <button class="btn btn-edit" onclick="openEditModal(${item.id})">✏️</button>
                <button class="btn btn-danger" onclick="deleteItem(${item.id})">🗑️</button>
            </td>
        `;
        mainTableBody.appendChild(tr);
    });
}

// Форматирование даты для отображения (ДД.ММ.ГГГГ)
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Поиск
searchInput.addEventListener('input', (e) => {
    renderMainTable(e.target.value);
});

// ==========================================
// 4. МОДАЛЬНОЕ ОКНО (ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ)
// ==========================================
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');

document.getElementById('btnAddMainRow').addEventListener('click', () => {
    document.getElementById('modalTitle').innerText = 'Добавить запись';
    editForm.reset();
    document.getElementById('editId').value = '';
    modal.style.display = 'block';
});

closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };

// Открытие модального окна для редактирования
window.openEditModal = function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('modalTitle').innerText = 'Редактировать запись';
    document.getElementById('editId').value = item.id;
    document.getElementById('editItemName').value = item.itemName || '';
    document.getElementById('editLocation').value = item.location || '';
    document.getElementById('editDateTaken').value = item.dateTaken || '';
    document.getElementById('editDateImplemented').value = item.dateImplemented || '';
    document.getElementById('editInvNumber').value = item.invNumber || '';
    document.getElementById('editQuantity').value = item.quantity || 1;
    document.getElementById('editInvoiceNumber').value = item.invoiceNumber || '';
    document.getElementById('editSerialNumber').value = item.serialNumber || '';
    
    modal.style.display = 'block';
};

// Сохранение записи из модального окна
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const itemData = {
        itemName: document.getElementById('editItemName').value,
        location: document.getElementById('editLocation').value,
        dateTaken: document.getElementById('editDateTaken').value,
        dateImplemented: document.getElementById('editDateImplemented').value,
        invNumber: document.getElementById('editInvNumber').value,
        quantity: parseInt(document.getElementById('editQuantity').value) || 1,
        invoiceNumber: document.getElementById('editInvoiceNumber').value,
        serialNumber: document.getElementById('editSerialNumber').value,
    };

    if (id) {
        // Редактирование
        const index = inventory.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
            inventory[index] = { ...inventory[index], ...itemData };
        }
    } else {
        // Добавление
        itemData.id = Date.now();
        inventory.push(itemData);
    }
    
    saveData();
    renderMainTable(searchInput.value);
    modal.style.display = 'none';
});

// Удаление записи
window.deleteItem = function(id) {
    if (confirm('Вы уверены, что хотите удалить эту запись?')) {
        inventory = inventory.filter(item => item.id !== id);
        saveData();
        renderMainTable(searchInput.value);
    }
};

// ==========================================
// 5. ВКЛАДКА ПРИХОД (ПОСТАВКИ)
// ==========================================
const receiptItemsContainer = document.getElementById('receiptItems');
document.getElementById('btnAddReceiptItem').addEventListener('click', addReceiptItemRow);

function addReceiptItemRow() {
    const row = document.createElement('div');
    row.className = 'receipt-item-row';
    row.innerHTML = `
        <input type="text" class="r-item-name" placeholder="Название (МФУ, Картридж...)" required>
        <input type="text" class="r-item-inv" placeholder="Инв. номер">
        <input type="text" class="r-item-serial" placeholder="Серийный номер">
        <input type="number" class="r-item-qty" placeholder="Кол-во" min="1" value="1" required>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">Удалить</button>
    `;
    receiptItemsContainer.appendChild(row);
}

// Обработка формы прихода
document.getElementById('receiptForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const date = document.getElementById('receiptDate').value;
    const supplier = document.getElementById('receiptSupplier').value;
    const itemRows = document.querySelectorAll('.receipt-item-row');
    
    if (itemRows.length === 0) {
        alert('Добавьте хотя бы один предмет в накладную!');
        return;
    }

    const receiptData = {
        id: Date.now(),
        date: date,
        supplier: supplier,
        items: []
    };

    itemRows.forEach(row => {
        const itemName = row.querySelector('.r-item-name').value;
        const invNumber = row.querySelector('.r-item-inv').value;
        const serialNumber = row.querySelector('.r-item-serial').value;
        const qty = parseInt(row.querySelector('.r-item-qty').value) || 1;

        // Добавляем в массив приходов
        receiptData.items.push({ itemName, invNumber, serialNumber, qty });

        // Автоматически добавляем в общую таблицу учета
        inventory.push({
            id: Date.now() + Math.random(), // Уникальный ID
            itemName: itemName,
            location: 'Склад', // По умолчанию приходуется на склад
            dateTaken: '', // На складе еще не брали
            dateImplemented: date, // Дата прихода
            invNumber: invNumber,
            quantity: qty,
            invoiceNumber: `Приход от ${supplier}`,
            serialNumber: serialNumber
        });
    });

    receipts.push(receiptData);
    saveData();
    renderMainTable();
    
    // Очистка формы
    e.target.reset();
    receiptItemsContainer.innerHTML = '';
    alert('Приход успешно сохранен! Данные добавлены в общую таблицу учета.');
});

// Установка сегодняшней даты по умолчанию
// Функция установки сегодняшней даты (надежный способ)
function setTodayDate() {
    const dateInput = document.getElementById('receiptDate');
    if (dateInput && !dateInput.value) { // Ставим дату только если поле пустое
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// Вызываем установку даты при первой загрузке страницы
setTodayDate();

// ==========================================
// 6. ЭКСПОРТ И ИМПОРТ EXCEL / JSON
// ==========================================

// Экспорт главной таблицы в Excel
document.getElementById('btnExportExcel').addEventListener('click', () => {
    const table = document.getElementById('mainTable');
    const wb = XLSX.utils.table_to_book(table, { sheet: "Учет" });
    XLSX.writeFile(wb, `Учет_склада_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
});

// Экспорт бэкапа в JSON
document.getElementById('btnExportJson').addEventListener('click', () => {
    const dataStr = JSON.stringify({ inventory, receipts }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sklad_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
});

// Импорт бэкапа из JSON
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

// ==========================================
// 7. ОТЧЕТЫ
// ==========================================
document.getElementById('btnGenerateReport').addEventListener('click', generateReport);

function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const startDateInput = document.getElementById('reportStartDate').value;
    
    let startDate = new Date();
    let endDate = new Date();
    
    if (startDateInput) {
        startDate = new Date(startDateInput);
    } else {
        // Если дата не выбрана, берем текущую
        startDate.setDate(1); // Начало текущего месяца
    }
    
    // Настройка конечной даты в зависимости от периода
    if (period === 'month') {
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
    } else if (period === 'halfyear') {
        endDate.setMonth(startDate.getMonth() + 6);
        endDate.setDate(0);
    } else if (period === 'year') {
        endDate.setFullYear(startDate.getFullYear() + 1);
        endDate.setDate(0);
    }

    // Фильтрация данных по дате внедрения (или взятия)
    const filtered = inventory.filter(item => {
        if (!item.dateImplemented) return false;
        const itemDate = new Date(item.dateImplemented);
        return itemDate >= startDate && itemDate <= endDate;
    });

    // Подсчет статистики
    let totalReceived = 0;
    let totalIssued = 0;
    let totalWrittenOff = 0;
    const itemsSummary = {}; // Группировка по названию

    filtered.forEach(item => {
        const qty = item.quantity || 0;
        const name = item.itemName || 'Неизвестно';
        
        if (!itemsSummary[name]) {
            itemsSummary[name] = { received: 0, issued: 0, writtenOff: 0 };
        }

        // Логика: если "Где" = Склад, то это приход. Если "Списано" - списание. Иначе - выдача.
        if (item.location.toLowerCase().includes('склад')) {
            totalReceived += qty;
            itemsSummary[name].received += qty;
        } else if (item.location.toLowerCase().includes('спис')) {
            totalWrittenOff += qty;
            itemsSummary[name].writtenOff += qty;
        } else {
            totalIssued += qty;
            itemsSummary[name].issued += qty;
        }
    });

    // Формирование HTML отчета
    const reportOutput = document.getElementById('reportOutput');
    
    let html = `
        <div class="report-section">
            <h3>Общая статистика за период: ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}</h3>
            <p><strong>Всего поступило на склад:</strong> ${totalReceived} ед.</p>
            <p><strong>Выдано в отделения:</strong> ${totalIssued} ед.</p>
            <p><strong>Списано:</strong> ${totalWrittenOff} ед.</p>
        </div>
        <div class="report-section">
            <h3>Детализация по предметам</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Наименование</th>
                        <th>Приход</th>
                        <th>Расход (Выдано)</th>
                        <th>Списано</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const [name, data] of Object.entries(itemsSummary)) {
        html += `
            <tr>
                <td>${name}</td>
                <td>${data.received}</td>
                <td>${data.issued}</td>
                <td>${data.writtenOff}</td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;
    
    reportOutput.innerHTML = html;
    reportOutput.dataset.period = `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`;
}

// Экспорт отчета в Excel
document.getElementById('btnExportReport').addEventListener('click', () => {
    const reportOutput = document.getElementById('reportOutput');
    if (!reportOutput.querySelector('table')) {
        alert('Сначала сформируйте отчет!');
        return;
    }
    
    const wb = XLSX.utils.table_to_book(reportOutput.querySelector('table'), { sheet: "Отчет" });
    XLSX.writeFile(wb, `Отчет_склад_${new Date().toLocaleDateString('ru-RU')}.xlsx`);
});

// Первоначальная отрисовка
renderMainTable();