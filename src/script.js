// Импорт данных категорий
import { categoriesData as importedCategoriesData } from './data.js';

// Глобальные переменные
let subscriptions = [];
let nextId = 1;
let categoriesData = importedCategoriesData;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    loadCategoriesData();
    initializeApp();
    setupEventListeners();
    loadFromStorage();
    updateTotals();
});

// Загрузка данных категорий из JSON
function loadCategoriesData() {
    try {
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // Fallback данные
        categoriesData = [];
    }
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    categoriesData.forEach((categoryData, index) => {
        const categoryId = categoryData.category.toLowerCase().replace(/[^a-zа-я0-9]/g, '-');

        const categoryHTML = `
            <div class="category" data-category="${categoryId}">
                <div class="category-header">
                    <h2>${categoryData.category}</h2>
                    <span class="category-count">0</span>
                    <span class="toggle-icon">⌄</span>
                </div>
                <div class="category-content">
                    ${categoryData.services.map(service => {
                        const serviceId = `${categoryId}-${service.name.toLowerCase().replace(/[^a-zа-я0-9]/g, '-')}`;
                        const hasPrice = service.price && service.price !== '';
                        const priceValue = hasPrice ? service.price : '';
                        const periodValue = service.period || 'month';

                        return `
                            <div class="subscription-item" data-service="${service.name}">
                                <div class="subscription-main">
                                    <label for="${serviceId}">${service.name}</label>
                                    <input type="checkbox" id="${serviceId}">
                                </div>
                                <div class="price-inputs">
                                    <input type="number" placeholder="Цена" min="0" step="0.01" value="${priceValue}">
                                    <select>
                                        <option value="month" ${periodValue === 'month' ? 'selected' : ''}>₽/мес</option>
                                        <option value="week" ${periodValue === 'week' ? 'selected' : ''}>₽/нед</option>
                                        <option value="year" ${periodValue === 'year' ? 'selected' : ''}>₽/год</option>
                                    </select>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    <div class="add-custom">
                        <button class="add-btn" data-category="${categoryId}">+ Добавить свою подписку</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML += categoryHTML;
    });

    // Настраиваем обработчики после создания элементов
    setupAllSubscriptionEventListeners();
}

// Инициализация приложения
function initializeApp() {
    // Инициализация всех категорий как свернутых
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        category.classList.add('collapsed');
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для категорий (сворачивание/разворачивание)
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', function() {
            const category = this.parentElement;
            category.classList.toggle('collapsed');
        });
    });

    // Обработчики для кнопок добавления подписки
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            showAddForm(category);
        });
    });

    // Обработчики для кнопок управления
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('reset-btn').addEventListener('click', resetData);

    // Настраиваем обработчики для всех существующих элементов подписок
    setupAllSubscriptionEventListeners();
}

// Настройка обработчиков для всех элементов подписок
function setupAllSubscriptionEventListeners() {
    // Обработчики для чекбоксов подписок
    document.querySelectorAll('.subscription-item input[type="checkbox"]').forEach(checkbox => {
        // Удаляем старые обработчики, если они есть
        checkbox.removeEventListener('change', handleCheckboxChange);
        // Добавляем новый обработчик
        checkbox.addEventListener('change', handleCheckboxChange);
    });

    // Обработчики для полей ввода цены
    document.querySelectorAll('.subscription-item input[type="number"]').forEach(input => {
        input.removeEventListener('input', handlePriceInput);
        input.addEventListener('input', handlePriceInput);
    });

    // Обработчики для селектов периода
    document.querySelectorAll('.subscription-item select').forEach(select => {
        select.removeEventListener('change', handlePeriodSelect);
        select.addEventListener('change', handlePeriodSelect);
    });
}

// Обработчик изменения чекбокса
function handleCheckboxChange(event) {
    const subscriptionItem = event.target.closest('.subscription-item');
    const isActive = event.target.checked;

    subscriptionItem.classList.toggle('active', isActive);

    if (isActive) {
        // Активируем поля ввода цены
        const priceInput = subscriptionItem.querySelector('input[type="number"]');
        if (priceInput && !priceInput.value) {
            priceInput.focus();
        }
    }

    updateSubscription();
    updateTotals();
}

// Обработчик изменения поля цены
function handlePriceInput(event) {
    updateSubscription();
    updateTotals();
}

// Обработчик изменения селекта периода
function handlePeriodSelect(event) {
    updateSubscription();
    updateTotals();
}

// Показать форму добавления подписки
function showAddForm(category) {
    const categoryElement = document.querySelector(`[data-category="${category}"]`);
    if (categoryElement) {
        const addCustomDiv = categoryElement.querySelector('.add-custom');

        // Создаем форму
        const form = document.createElement('div');
        form.className = 'add-form';
        form.innerHTML = `
            <input type="text" placeholder="Название подписки" class="custom-name">
            <div class="price-inputs">
                <input type="number" placeholder="Цена" min="0" step="0.01" class="custom-price">
                <select class="custom-period">
                    <option value="month">₽/мес</option>
                    <option value="week">₽/нед</option>
                    <option value="year">₽/год</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn-save">Добавить</button>
                <button class="btn-cancel">Отмена</button>
            </div>
        `;

        // Вставляем форму перед кнопкой добавления
        addCustomDiv.insertBefore(form, addCustomDiv.querySelector('.add-btn'));

        // Обработчики для формы
        form.querySelector('.btn-save').addEventListener('click', function() {
            const name = form.querySelector('.custom-name').value.trim();
            const price = parseFloat(form.querySelector('.custom-price').value);
            const period = form.querySelector('.custom-period').value;

            if (name && price > 0) {
                addCustomSubscription(category, name, price, period);
                form.remove();
            } else {
                alert('Пожалуйста, заполните все поля корректно');
            }
        });

        form.querySelector('.btn-cancel').addEventListener('click', function() {
            form.remove();
        });

        // Фокус на поле названия
        form.querySelector('.custom-name').focus();
    }
}

// Добавить кастомную подписку
function addCustomSubscription(category, name, price, period) {
    const subscriptionId = nextId++;
    const subscription = {
        id: subscriptionId,
        category: category,
        name: name,
        price: price,
        period: period,
        isActive: true,
        isCustom: true
    };

    subscriptions.push(subscription);

    // Создаем HTML элемент
    const categoryElement = document.querySelector(`[data-category="${category}"]`);
    if (categoryElement) {
        const categoryContent = categoryElement.querySelector('.category-content');
        const addCustomDiv = categoryElement.querySelector('.add-custom');

        const subscriptionElement = document.createElement('div');
        subscriptionElement.className = 'subscription-item custom active';
        subscriptionElement.setAttribute('data-subscription-id', subscriptionId);
        subscriptionElement.innerHTML = `
            <div class="subscription-main">
                <label>${name}</label>
                <input type="checkbox" checked>
                <button class="delete-btn">×</button>
            </div>
            <div class="price-inputs">
                <input type="number" value="${price}" min="0" step="0.01">
                <select>
                    <option value="month" ${period === 'month' ? 'selected' : ''}>₽/мес</option>
                    <option value="week" ${period === 'week' ? 'selected' : ''}>₽/нед</option>
                    <option value="year" ${period === 'year' ? 'selected' : ''}>₽/год</option>
                </select>
            </div>
        `;

        // Вставляем перед кнопкой добавления
        categoryContent.insertBefore(subscriptionElement, addCustomDiv);

        // Настраиваем обработчики для нового элемента
        setupSubscriptionEventListeners(subscriptionElement);

        // Переустанавливаем все обработчики
        setupAllSubscriptionEventListeners();

        updateTotals();
        saveToStorage();
    }
}

// Настройка обработчиков для элемента подписки
function setupSubscriptionEventListeners(subscriptionElement) {
    const checkbox = subscriptionElement.querySelector('input[type="checkbox"]');
    const priceInput = subscriptionElement.querySelector('input[type="number"]');
    const periodSelect = subscriptionElement.querySelector('select');
    const deleteBtn = subscriptionElement.querySelector('.delete-btn');

    checkbox.addEventListener('change', function() {
        const isActive = this.checked;
        subscriptionElement.classList.toggle('active', isActive);
        updateSubscription();
        updateTotals();
    });

    priceInput.addEventListener('input', function() {
        updateSubscription();
        updateTotals();
    });

    periodSelect.addEventListener('change', function() {
        updateSubscription();
        updateTotals();
    });

    deleteBtn.addEventListener('click', function() {
        const subscriptionId = parseInt(subscriptionElement.getAttribute('data-subscription-id'));
        deleteCustomSubscription(subscriptionId);
    });
}

// Удалить кастомную подписку
function deleteCustomSubscription(subscriptionId) {
    if (confirm('Удалить эту подписку?')) {
        subscriptions = subscriptions.filter(sub => sub.id !== subscriptionId);

        const subscriptionElement = document.querySelector(`[data-subscription-id="${subscriptionId}"]`);
        if (subscriptionElement) {
            subscriptionElement.remove();
        }

        updateTotals();
        saveToStorage();
    }
}

// Обновить данные подписки
function updateSubscription() {
    const subscriptionItems = document.querySelectorAll('.subscription-item');

    subscriptions = [];
    nextId = 1;

    subscriptionItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const priceInput = item.querySelector('input[type="number"]');
        const periodSelect = item.querySelector('select');
        const label = item.querySelector('label');

        if (checkbox && priceInput && periodSelect && label) {
            const isActive = checkbox.checked;
            const price = parseFloat(priceInput.value) || 0;
            const period = periodSelect.value;
            const name = label.textContent.trim();
            const category = item.closest('.category').getAttribute('data-category');
            const isCustom = item.classList.contains('custom');

            if (isActive && price > 0) {
                const subscription = {
                    id: nextId++,
                    category: category,
                    name: name,
                    price: price,
                    period: period,
                    isActive: isActive,
                    isCustom: isCustom
                };

                subscriptions.push(subscription);
            }
        }
    });

    saveToStorage();
}

// Обновить итоговые суммы
function updateTotals() {
    let monthlyTotal = 0;

    subscriptions.forEach(subscription => {
        if (subscription.isActive) {
            let monthlyPrice = subscription.price;

            // Конвертируем в месячную стоимость
            switch (subscription.period) {
                case 'week':
                    monthlyPrice = subscription.price * 52 / 12; // 52 недели в году / 12 месяцев
                    break;
                case 'year':
                    monthlyPrice = subscription.price / 12;
                    break;
                case 'month':
                default:
                    monthlyPrice = subscription.price;
                    break;
            }

            monthlyTotal += monthlyPrice;
        }
    });

    const yearlyTotal = monthlyTotal * 12;

    // Обновляем отображение
    document.getElementById('monthly-total').textContent = formatNumber(monthlyTotal);
    document.getElementById('yearly-total').textContent = formatNumber(yearlyTotal);

    // Обновляем счетчики категорий
    updateCategoryCounts();
}

// Обновить счетчики активных подписок в категориях
function updateCategoryCounts() {
    const categories = document.querySelectorAll('.category');

    categories.forEach(category => {
        const categoryName = category.getAttribute('data-category');
        const activeSubscriptions = subscriptions.filter(sub =>
            sub.category === categoryName && sub.isActive
        );

        const countElement = category.querySelector('.category-count');
        if (countElement) {
            countElement.textContent = activeSubscriptions.length;
        }
    });
}

// Форматирование чисел
function formatNumber(num) {
    return Math.round(num).toLocaleString('ru-RU');
}

// Сохранение в localStorage
function saveToStorage() {
    try {
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    } catch (error) {
        console.error('Ошибка сохранения в localStorage:', error);
    }
}

// Загрузка из localStorage
function loadFromStorage() {
    try {
        const saved = localStorage.getItem('subscriptions');
        if (saved) {
            subscriptions = JSON.parse(saved);
            restoreUI();
        }
    } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
        subscriptions = [];
    }
}

// Восстановление UI из сохраненных данных
function restoreUI() {
    // Сначала очищаем все чекбоксы
    document.querySelectorAll('.subscription-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        const subscriptionItem = checkbox.closest('.subscription-item');
        subscriptionItem.classList.remove('active');
    });

    // Удаляем все кастомные подписки
    document.querySelectorAll('.subscription-item.custom').forEach(item => {
        item.remove();
    });

    // Восстанавливаем подписки
    subscriptions.forEach(subscription => {
        if (!subscription.isCustom) {
            // Сначала пытаемся восстановить как предустановленную подписку
            const categoryElement = document.querySelector(`[data-category="${subscription.category}"]`);
            if (categoryElement) {
                const subscriptionElement = categoryElement.querySelector(`[data-service="${subscription.name}"]`);

                if (subscriptionElement) {
                    // Найдена предустановленная подписка - восстанавливаем как обычно
                    const checkbox = subscriptionElement.querySelector('input[type="checkbox"]');
                    const priceInput = subscriptionElement.querySelector('input[type="number"]');
                    const periodSelect = subscriptionElement.querySelector('select');

                    if (subscription.isActive) {
                        checkbox.checked = true;
                        subscriptionElement.classList.add('active');
                    }

                    if (priceInput) priceInput.value = subscription.price;
                    if (periodSelect) periodSelect.value = subscription.period;
                } else {
                    // Предустановленная подписка не найдена, но была экспортирована
                    // Добавляем как кастомную подписку
                    restoreCustomSubscription(subscription);
                }
            } else {
                // Категория не найдена, но подписка была экспортирована
                // Добавляем как кастомную подписку
                restoreCustomSubscription(subscription);
            }
        } else {
            // Восстанавливаем кастомные подписки
            restoreCustomSubscription(subscription);
        }
    });

    // Обновляем nextId
    if (subscriptions.length > 0) {
        nextId = Math.max(...subscriptions.map(sub => sub.id)) + 1;
    }
}

// Восстановить кастомную подписку
function restoreCustomSubscription(subscription) {
    const categoryElement = document.querySelector(`[data-category="${subscription.category}"]`);
    if (categoryElement) {
        const categoryContent = categoryElement.querySelector('.category-content');
        const addCustomDiv = categoryElement.querySelector('.add-custom');

        const subscriptionElement = document.createElement('div');
        subscriptionElement.className = `subscription-item custom ${subscription.isActive ? 'active' : ''}`;
        subscriptionElement.setAttribute('data-subscription-id', subscription.id);
        subscriptionElement.innerHTML = `
            <div class="subscription-main">
                <label>${subscription.name}</label>
                <input type="checkbox" ${subscription.isActive ? 'checked' : ''}>
                <button class="delete-btn">×</button>
            </div>
            <div class="price-inputs">
                <input type="number" value="${subscription.price}" min="0" step="0.01">
                <select>
                    <option value="month" ${subscription.period === 'month' ? 'selected' : ''}>₽/мес</option>
                    <option value="week" ${subscription.period === 'week' ? 'selected' : ''}>₽/нед</option>
                    <option value="year" ${subscription.period === 'year' ? 'selected' : ''}>₽/год</option>
                </select>
            </div>
        `;

        categoryContent.insertBefore(subscriptionElement, addCustomDiv);
        setupSubscriptionEventListeners(subscriptionElement);

        // Переустанавливаем все обработчики
        setupAllSubscriptionEventListeners();
    } else {
        // Если категория не найдена, создаем её в категории "Другое"
        const otherCategoryElement = document.querySelector(`[data-category="другое"]`);
        if (otherCategoryElement) {
            const categoryContent = otherCategoryElement.querySelector('.category-content');
            const addCustomDiv = otherCategoryElement.querySelector('.add-custom');

            const subscriptionElement = document.createElement('div');
            subscriptionElement.className = `subscription-item custom ${subscription.isActive ? 'active' : ''}`;
            subscriptionElement.setAttribute('data-subscription-id', subscription.id);
            subscriptionElement.innerHTML = `
                <div class="subscription-main">
                    <label>${subscription.name}</label>
                    <input type="checkbox" ${subscription.isActive ? 'checked' : ''}>
                    <button class="delete-btn">×</button>
                </div>
                <div class="price-inputs">
                    <input type="number" value="${subscription.price}" min="0" step="0.01">
                    <select>
                        <option value="month" ${subscription.period === 'month' ? 'selected' : ''}>₽/мес</option>
                        <option value="week" ${subscription.period === 'week' ? 'selected' : ''}>₽/нед</option>
                        <option value="year" ${subscription.period === 'year' ? 'selected' : ''}>₽/год</option>
                    </select>
                </div>
            `;

            categoryContent.insertBefore(subscriptionElement, addCustomDiv);
            setupSubscriptionEventListeners(subscriptionElement);

            // Переустанавливаем все обработчики
            setupAllSubscriptionEventListeners();
        }
    }
}

// Экспорт данных
function exportData() {
    const data = {
        subscriptions: subscriptions,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Данные экспортированы');
}

// Импорт данных
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.subscriptions && Array.isArray(data.subscriptions)) {
                if (confirm('Импортировать данные? Текущие данные будут заменены.')) {
                    subscriptions = data.subscriptions;
                    restoreUI();
                    updateTotals();
                    saveToStorage();
                    showNotification('Данные импортированы');
                }
            } else {
                alert('Неверный формат файла');
            }
        } catch (error) {
            alert('Ошибка при чтении файла');
            console.error('Import error:', error);
        }
    };

    reader.readAsText(file);
    event.target.value = ''; // Очищаем input
}

// Сброс данных
function resetData() {
    subscriptions = [];
    nextId = 1;

    // Очищаем все чекбоксы и поля
    document.querySelectorAll('.subscription-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        const subscriptionItem = checkbox.closest('.subscription-item');
        subscriptionItem.classList.remove('active');
    });

    // Восстанавливаем дефолтные цены из categoriesData
    document.querySelectorAll('.subscription-item').forEach(item => {
        const label = item.querySelector('label');
        const priceInput = item.querySelector('input[type="number"]');
        const periodSelect = item.querySelector('select');

        if (label && priceInput && periodSelect) {
            const serviceName = label.textContent.trim();
            const category = item.closest('.category').getAttribute('data-category');

            // Находим соответствующий сервис в categoriesData
            const categoryData = categoriesData.find(cat =>
                cat.category.toLowerCase().replace(/[^a-zа-я0-9]/g, '-') === category
            );

            if (categoryData) {
                const service = categoryData.services.find(s => s.name === serviceName);
                if (service) {
                    // Восстанавливаем дефолтную цену и период
                    priceInput.value = service.price || '';
                    periodSelect.value = service.period || 'month';
                } else {
                    // Если сервис не найден, очищаем поля
                    priceInput.value = '';
                    periodSelect.value = 'month';
                }
            } else {
                // Если категория не найдена, очищаем поля
                priceInput.value = '';
                periodSelect.value = 'month';
            }
        }
    });

    // Удаляем все кастомные подписки
    document.querySelectorAll('.subscription-item.custom').forEach(item => {
        item.remove();
    });

    // Очищаем localStorage
    localStorage.removeItem('subscriptions');

    updateTotals();
    showNotification('Данные сброшены');
}

// Показать уведомление
function showNotification(message) {
    // Удаляем существующие уведомления
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Ошибка:', e.error);
});

// Обработка необработанных промисов
window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанная ошибка промиса:', e.reason);
});
