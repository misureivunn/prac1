const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

class PresentationLayer {
    constructor(logic) {
        this.logic = logic;
        this.rl = readline.createInterface({ input, output });
    }

    async run() {
        while (true) {
            if (!this.logic.getCurrentUser()) {
                await this.loginMenu();
            } else {
                await this.mainMenu();
            }
        }
    }

    async loginMenu() {
        console.log("\n--- ВХОД В СИСТЕМУ ---");
        const login = await this.rl.question("Логин: ");
        const pass = await this.rl.question("Пароль: ");

        const authResult = this.logic.authenticate(login, pass);
        if (!authResult.success) {
            console.log("[ОШИБКА] Неверные данные.");
            return;
        }

        // For employees, ask to select working zone (session-only)
        if (authResult.role === 'employee') {
            const zones = [...new Set(this.logic.getAllTickets().map(t => t.assigned_zone))];
            if (zones.length > 0) {
                console.log("\nДоступные зоны для работы:");
                zones.forEach((z, i) => console.log((i + 1) + ". " + z));
                const idxStr = await this.rl.question("Выберите номер зоны (или enter для пропуска): ");
                const idx = parseInt(idxStr) - 1;
                if (!isNaN(idx) && idx >= 0 && idx < zones.length) {
                    this.logic.setStaffZone(zones[idx]);
                    console.log("Установлена зона: " + zones[idx]);
                }
            }
        }
    }

    async mainMenu() {
        const user = this.logic.getCurrentUser();
        const currentZone = this.logic.getStaffZone();

        console.log("\n========== ГЛАВНОЕ МЕНЮ =========");
        console.log("Пользователь: " + user.login + " (" + user.role + ")");
        if (currentZone) console.log("Текущая зона: " + currentZone);
        console.log("================================");

        console.log("\n1. Сканировать билет");
        console.log("2. Сообщить об инциденте");
        if (user.role === 'engineer') {
            console.log("3. Просмотр всех билетов");
            console.log("4. Просмотр персонала");
            console.log("5. Создать билет (регистрация посетителя)");
            console.log("6. Регистрация нового сотрудника");
        } else if (user.role === 'employee') {
            console.log("3. Установить/сменить рабочую зону");
        }
        console.log("0. Выйти из аккаунта");

        const choice = await this.rl.question("\nВыбор: ");

        if (choice === "1") {
            await this.scanTicket();
        } else if (choice === "2") {
            await this.reportIncidentMenu();
        } else if (choice === "3" && user.role === 'engineer') {
            await this.viewAllTickets();
        } else if (choice === "4" && user.role === 'engineer') {
            await this.viewAllStaff();
        } else if (choice === "5" && user.role === 'engineer') {
            await this.registerTicketMenu();
        } else if (choice === "6" && user.role === 'engineer') {
            await this.registerNewUser();
        } else if (choice === "3" && user.role === 'employee') {
            await this.setWorkingZoneMenu();
        } else if (choice === "0") {
            this.logic.logout();
            console.log("[ОК] Вы вышли из системы.");
        } else {
            console.log("[ОШИБКА] Неверный выбор. Попробуйте снова.");
        }
    }

    async scanTicket() {
        const code = await this.rl.question("\nКод билета: ");
        const res = this.logic.processAccess(code);

        if (res.success) {
            console.log("[ОК] " + res.msg);
        } else {
            console.log("[ОШИБКА] " + res.msg);
            if (res.alert) console.log("[ВНИМАНИЕ] Попытка несанкционированного доступа!");
        }
    }

    async reportIncidentMenu() {
        console.log("\n--- ОТЧЕТ ОБ ИНЦИДЕНТЕ ---");
        const type = await this.rl.question("Тип инцидента: ");
        const severityChoice = await this.rl.question("Серьезность (Low/High): ");
        const severity = severityChoice === 'High' ? 'High' : 'Low';
        const description = await this.rl.question("Описание: ");

        const res = this.logic.reportIncident(type, severity, description);
        if (res.success) {
            console.log("[ОК] Инцидент зарегистрирован (id=" + res.incident.id + ")");
            if (res.alert) console.log("[ALERT] Высокая серьезность!");
        } else {
            console.log("[ОШИБКА] Не удалось зарегистрировать инцидент.");
        }
    }

    async viewAllTickets() {
        console.log("\n--- ВСЕ БИЛЕТЫ ---");
        const tickets = this.logic.getAllTickets();
        if (!tickets || tickets.length === 0) {
            console.log("[ИНФОРМАЦИЯ] Билетов нет.");
            return;
        }
        const table = tickets.map(t => ({ 'Код': t.ticket_code, 'ФИО': t.owner_name, 'Телефон': t.phone, 'Зона': t.assigned_zone, 'Событие': t.event_name, 'В зале': t.is_inside ? 'Да' : 'Нет' }));
        console.table(table);
    }

    async viewAllStaff() {
        console.log("\n--- ПЕРСОНАЛ ---");
        const staff = this.logic.getAllStaff();
        if (!staff || staff.length === 0) {
            console.log("[ИНФОРМАЦИЯ] Персонал не найден.");
            return;
        }
        const table = staff.map(u => ({ 'Логин': u.login, 'Роль': u.role }));
        console.table(table);
    }

    async registerTicketMenu() {
        console.log("\n--- СОЗДАНИЕ БИЛЕТА ---");
        const code = await this.rl.question("Код билета: ");
        const name = await this.rl.question("ФИО владельца: ");
        const phone = await this.rl.question("Телефон: ");
        const event_name = await this.rl.question("Название события: ");
        const assigned_zone = await this.rl.question("Зона: ");
        const capStr = await this.rl.question("Вместимость события (число): ");
        const cap = parseInt(capStr) || 0;

        const res = this.logic.registerTicket(code, name, phone, event_name, assigned_zone, cap);
        if (res.success) console.log("[ОК] Билет создан."); else console.log("[ОШИБКА] Не удалось создать билет.");
    }

    async registerNewUser() {
        console.log("\n--- РЕГИСТРАЦИЯ НОВОГО СОТРУДНИКА ---");
        const login = await this.rl.question("Логин: ");
        const pass = await this.rl.question("Пароль: ");
        const roleChoice = await this.rl.question("Роль (employee/engineer): ");
        const role = roleChoice === 'engineer' ? 'engineer' : 'employee';
        const res = this.logic.registerUser(login, pass, role);
        if (res.success) console.log("[ОК] Пользователь зарегистрирован."); else console.log("[ОШИБКА] Не удалось зарегистрировать пользователя.");
    }

    async setWorkingZoneMenu() {
        const zones = [...new Set(this.logic.getAllTickets().map(t => t.assigned_zone))];
        if (zones.length === 0) { console.log('[ИНФО] Зон не найдено.'); return; }
        console.log('\nДоступные зоны:'); zones.forEach((z,i)=>console.log((i+1)+'. '+z));
        const idxStr = await this.rl.question('Номер зоны: ');
        const idx = parseInt(idxStr)-1;
        if (isNaN(idx) || idx<0 || idx>=zones.length) { console.log('[ОШИБКА] Неверный выбор.'); return; }
        this.logic.setStaffZone(zones[idx]); console.log('[ОК] Установлена зона: '+zones[idx]);
    }
}

module.exports = PresentationLayer;
