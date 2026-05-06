// 全局变量
let currentDateOffset = 0;
let currentMeals = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
};
let dailyRecords = {};
let targetKcal = 1600;
let resultKcal = 0;
let selectedMealType = '';
let currentFoodDescription = '';

// 初始化数据
function initData() {
    const today = new Date().toISOString().split('T')[0];
    if (!localStorage.getItem('dailyRecords')) {
        // Mock数据
        const mockData = {
            [today]: {
                breakfast: [{ kcal: 350, time: '08:30', description: '牛奶面包' }],
                lunch: [{ kcal: 700, time: '12:00', description: '米饭炒菜' }],
                snack: [{ kcal: 200, time: '15:30', description: '苹果' }, { kcal: 300, time: '17:00', description: '饼干' }],
                dinner: []
            }
        };
        localStorage.setItem('dailyRecords', JSON.stringify(mockData));
    }
    dailyRecords = JSON.parse(localStorage.getItem('dailyRecords'));
}

// 获取当前显示的日期
function getCurrentDateStr() {
    const date = new Date();
    date.setDate(date.getDate() + currentDateOffset);
    return date.toISOString().split('T')[0];
}

// 获取显示的日期标签
function getDateLabel(offset) {
    if (offset === 0) return '今天';
    if (offset === -1) return '昨天';
    if (offset === 1) return '明天';
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 切换日期
function changeDate(offset) {
    currentDateOffset += offset;
    updateDateDisplay();
    loadRecords();
}

// 更新日期显示
function updateDateDisplay() {
    document.getElementById('yesterday-label').textContent = getDateLabel(currentDateOffset - 1);
    document.getElementById('today-label').textContent = getDateLabel(currentDateOffset);
    document.getElementById('tomorrow-label').textContent = getDateLabel(currentDateOffset + 1);
    
    // 更新日期标签激活状态
    const labels = document.querySelectorAll('.date-label');
    labels.forEach((label, index) => {
        label.classList.toggle('active', index === 1);
    });
    
    document.getElementById('current-date').textContent = getDateLabel(currentDateOffset);
}

// 根据时间获取分类
function getMealCategory(hour) {
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 21) return 'dinner';
    return 'snack';
}

// 加载记录
function loadRecords() {
    const dateStr = getCurrentDateStr();
    currentMeals = dailyRecords[dateStr] || {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: []
    };
    renderMealCards();
    updateSummary();
}

// 渲染餐食卡片
function renderMealCards() {
    const container = document.getElementById('meal-cards');
    container.innerHTML = '';

    const meals = [
        { key: 'breakfast', title: '🍳 早餐', icon: '🍳' },
        { key: 'lunch', title: '🍱 午餐', icon: '🍱' },
        { key: 'snack', title: '🍪 加餐', icon: '🍪' },
        { key: 'dinner', title: '🍝 晚餐', icon: '🍝' }
    ];

    meals.forEach(meal => {
        const items = currentMeals[meal.key] || [];
        const card = document.createElement('div');
        card.className = `meal-card${items.length === 0 ? ' empty' : ''}`;
        
        if (items.length > 0) {
            card.innerHTML = `
                <div class="meal-header">
                    <span class="meal-title">${meal.title}（${items.length}）</span>
                </div>
                <div class="meal-content">
                    ${items.map((item, index) => `
                        <div class="food-item">
                            <div class="food-photo-placeholder">[📷]</div>
                            <div class="food-info">
                                <div class="food-name">${item.description || '未命名'}</div>
                                <div class="food-kcal">${item.kcal} kcal</div>
                            </div>
                            <button class="delete-btn" onclick="deleteMealRecord('${meal.key}', ${index})">×</button>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="meal-header">
                    <span class="meal-title">${meal.title}</span>
                </div>
                <div class="meal-content empty-content">
                    <div class="empty-text">❌ 未记录</div>
                    <button class="add-photo-btn" onclick="openAddModal()">📷 拍照</button>
                </div>
            `;
        }
        
        container.appendChild(card);
    });
}

// 删除餐食记录
function deleteMealRecord(mealType, index) {
    if (confirm('确定要删除这条记录吗？')) {
        const dateStr = getCurrentDateStr();
        if (dailyRecords[dateStr] && dailyRecords[dateStr][mealType]) {
            dailyRecords[dateStr][mealType].splice(index, 1);
            localStorage.setItem('dailyRecords', JSON.stringify(dailyRecords));
            loadRecords();
        }
    }
}

// 计算总卡路里
function calculateTotalKcal() {
    let total = 0;
    Object.values(currentMeals).forEach(items => {
        items.forEach(item => {
            total += item.kcal;
        });
    });
    return total;
}

// 判断状态
function getStatus(total) {
    const ratio = total / targetKcal;
    if (ratio < 0.8) return { emoji: '😢', text: '偏低', suggestion: '可以适当补充一点' };
    if (ratio <= 1.1) return { emoji: '😊', text: '正常', suggestion: '继续保持' };
    return { emoji: '😐', text: '偏高', suggestion: getSuggestion() };
}

// 获取建议
function getSuggestion() {
    const totals = {
        breakfast: currentMeals.breakfast.reduce((sum, item) => sum + item.kcal, 0),
        lunch: currentMeals.lunch.reduce((sum, item) => sum + item.kcal, 0),
        dinner: currentMeals.dinner.reduce((sum, item) => sum + item.kcal, 0),
        snack: currentMeals.snack.reduce((sum, item) => sum + item.kcal, 0)
    };
    
    const maxKey = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);
    
    switch (maxKey) {
        case 'snack':
            return '👉 加餐有点多，尽量减少零食';
        case 'dinner':
            return '👉 晚餐偏多，尽量清淡一点';
        case 'lunch':
            return '👉 午餐偏多，可以适当减少';
        case 'breakfast':
            return '👉 早餐偏多，注意控制';
        default:
            return '👉 注意饮食均衡';
    }
}

// 更新总结
function updateSummary() {
    const total = calculateTotalKcal();
    const status = getStatus(total);
    
    document.getElementById('total-kcal').textContent = total;
    document.getElementById('status-emoji').textContent = status.emoji;
    document.getElementById('summary-text').textContent = status.text;
    document.getElementById('suggestion-text').textContent = status.suggestion;
}

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // 更新导航状态
    if (pageId === 'home-page') {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-home')?.classList.add('active');
        document.getElementById('nav-home2')?.classList.add('active');
    } else if (pageId === 'trend-page') {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-trend')?.classList.add('active');
        document.getElementById('nav-trend2')?.classList.add('active');
    }
}

// 打开添加弹窗（选择餐食类型）
function openAddModal() {
    document.getElementById('add-modal').classList.add('active');
}

// 关闭添加弹窗
function closeAddModal() {
    document.getElementById('add-modal').classList.remove('active');
}

// 选择餐食类型
function selectMealType(mealType) {
    selectedMealType = mealType;
    closeAddModal();
    document.getElementById('photo-modal').classList.add('active');
}

// 关闭照片选择弹窗
function closePhotoModal() {
    document.getElementById('photo-modal').classList.remove('active');
}

// 选择照片
function selectPhoto() {
    closePhotoModal();
    const fileInput = document.getElementById('file-input');
    fileInput.setAttribute('capture', 'environment');
    fileInput.accept = 'image/*';
    fileInput.click();
}

// 从相册选择
function selectFromAlbum() {
    closePhotoModal();
    const fileInput = document.getElementById('file-input');
    fileInput.removeAttribute('capture');
    fileInput.accept = 'image/*';
    fileInput.click();
}

// 显示手动输入页面
function showManualInputPage() {
    closePhotoModal();
    document.getElementById('manual-food-name').value = '';
    document.getElementById('manual-food-kcal').value = '';
    showPage('manual-input-page');
}

// 从手动输入页面返回
function goBackFromManual() {
    showPage('home-page');
}

// 保存手动输入
function saveManualInput() {
    const foodName = document.getElementById('manual-food-name').value.trim();
    const kcal = parseInt(document.getElementById('manual-food-kcal').value) || 0;

    if (!foodName) {
        alert('请输入食品名称');
        return;
    }
    if (kcal <= 0) {
        alert('请输入有效的卡路里值');
        return;
    }

    const category = selectedMealType;
    const now = new Date();
    const dateStr = getCurrentDateStr();

    if (!dailyRecords[dateStr]) {
        dailyRecords[dateStr] = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: []
        };
    }

    dailyRecords[dateStr][category].push({
        kcal: kcal,
        time: now.toTimeString().slice(0, 5),
        description: foodName
    });

    localStorage.setItem('dailyRecords', JSON.stringify(dailyRecords));
    resultKcal = kcal;
    document.getElementById('result-kcal').textContent = resultKcal;
    showPage('complete-page');
}
// 文件选择处理
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('preview-image').src = event.target.result;
            document.getElementById('food-description').value = '';
            showPage('preview-page');
        };
        reader.readAsDataURL(file);
    }
});

// 开始识别
function startRecognition() {
    // 获取用户输入的食品描述
    currentFoodDescription = document.getElementById('food-description').value || '未命名';
    
    showPage('recognition-page');

    // 模拟识别过程
    setTimeout(() => {
        // 随机生成卡路里值（100-500之间）
        resultKcal = Math.floor(Math.random() * 400) + 100;

        // 使用用户选择的餐食类型
        const category = selectedMealType;
        const now = new Date();

        // 添加记录
        const dateStr = getCurrentDateStr();
        if (!dailyRecords[dateStr]) {
            dailyRecords[dateStr] = {
                breakfast: [],
                lunch: [],
                dinner: [],
                snack: []
            };
        }

        dailyRecords[dateStr][category].push({
            kcal: resultKcal,
            time: now.toTimeString().slice(0, 5),
            description: currentFoodDescription
        });

        localStorage.setItem('dailyRecords', JSON.stringify(dailyRecords));

        // 更新结果显示
        document.getElementById('result-kcal').textContent = resultKcal;
        showPage('complete-page');
    }, 2000 + Math.random() * 1000);
}

// 再拍一张
function addAnother() {
    showPage('home-page');
    setTimeout(() => {
        document.getElementById('photo-modal').classList.add('active');
    }, 100);
}

// 返回首页
function goHome() {
    loadRecords();
    showPage('home-page');
}

// 绘制趋势图
function drawTrendChart() {
    const canvas = document.getElementById('trend-chart');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = rect.width;
    const height = rect.height;
    
    // 获取近7天数据
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const records = dailyRecords[dateStr];
        if (records) {
            const total = Object.values(records).reduce((sum, items) => {
                return sum + items.reduce((s, item) => s + item.kcal, 0);
            }, 0);
            data.push(total);
        } else {
            data.push(0);
        }
    }
    
    // 计算图表参数
    const maxVal = Math.max(...data, 2000);
    const minVal = Math.min(...data.filter(v => v > 0), 0);
    const range = maxVal - minVal || 1;
    
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制网格
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // 水平网格线
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        // 刻度标签
        const val = Math.round(maxVal - (maxVal - minVal) * (i / 4));
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val.toString(), padding.left - 5, y + 3);
    }
    
    // 绘制折线
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const points = data.map((val, i) => {
        const x = padding.left + (chartWidth / 6) * i;
        const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
        return { x, y };
    });
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = '#ff6b6b';
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 绘制X轴标签
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        const x = padding.left + (chartWidth / 6) * i;
        ctx.fillText(label, x, height - 10);
    }
    
    // 更新趋势统计
    updateTrendStats(data);
}

// 更新趋势统计
function updateTrendStats(data) {
    const validData = data.filter(v => v > 0);
    const avg = validData.length > 0 
        ? Math.round(validData.reduce((a, b) => a + b, 0) / validData.length)
        : 0;
    
    const trendSummary = document.getElementById('trend-summary');
    const trendSuggestion = document.getElementById('trend-suggestion');
    
    if (avg > targetKcal * 1.1) {
        trendSummary.textContent = '👉 最近整体偏高';
    } else if (avg < targetKcal * 0.8) {
        trendSummary.textContent = '👉 最近整体偏低';
    } else {
        trendSummary.textContent = '👉 最近整体正常';
    }
    
    // 更新餐食分析
    updateMealAnalysis();
    
    // 更新建议
    const mealAnalysis = document.querySelectorAll('.analysis-status');
    const hasWarning = Array.from(mealAnalysis).some(el => el.classList.contains('warning'));
    if (hasWarning) {
        trendSuggestion.textContent = '👉 建议减少晚餐主食';
    } else if (avg > targetKcal) {
        trendSuggestion.textContent = '👉 建议适当控制饮食';
    } else {
        trendSuggestion.textContent = '👉 继续保持良好饮食习惯';
    }
}

// 更新餐食分析
function updateMealAnalysis() {
    // 获取最近7天各餐的平均值
    const mealTotals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    const mealCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const records = dailyRecords[dateStr];
        
        if (records) {
            Object.keys(mealTotals).forEach(key => {
                if (records[key] && records[key].length > 0) {
                    mealTotals[key] += records[key].reduce((sum, item) => sum + item.kcal, 0);
                    mealCounts[key]++;
                }
            });
        }
    }
    
    // 各餐目标值（按比例分配）
    const mealTargets = {
        breakfast: targetKcal * 0.25,
        lunch: targetKcal * 0.4,
        dinner: targetKcal * 0.3,
        snack: targetKcal * 0.05
    };
    
    // 更新状态
    const updateStatus = (element, key) => {
        const avg = mealCounts[key] > 0 ? mealTotals[key] / mealCounts[key] : 0;
        const ratio = avg / mealTargets[key];
        
        element.classList.remove('normal', 'high', 'warning');
        if (ratio === 0) {
            element.textContent = '无数据';
            element.classList.add('normal');
        } else if (ratio < 0.8) {
            element.textContent = '偏低';
            element.classList.add('normal');
        } else if (ratio <= 1.1) {
            element.textContent = '正常';
            element.classList.add('normal');
        } else if (ratio <= 1.3) {
            element.textContent = '略高';
            element.classList.add('high');
        } else {
            element.textContent = '偏高 ⚠️';
            element.classList.add('warning');
        }
    };
    
    updateStatus(document.querySelector('.meal-analysis .analysis-item:nth-child(1) .analysis-status'), 'breakfast');
    updateStatus(document.querySelector('.meal-analysis .analysis-item:nth-child(2) .analysis-status'), 'lunch');
    updateStatus(document.querySelector('.meal-analysis .analysis-item:nth-child(3) .analysis-status'), 'dinner');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initData();
    loadRecords();
    drawTrendChart();
    
    // 监听resize事件重绘图表
    window.addEventListener('resize', drawTrendChart);
});