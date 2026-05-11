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
    }

    async mainMenu() {
        const user = this.logic.getCurrentUser();
        const event = this.logic.getCurrentEventSummary();
        const currentZone = this.logic.getStaffZone();

        console.log("\n========== ГЛАВНОЕ МЕНЮ =========" );
        console.log("Событие: " + event.name);
        console.log("Статус: " + event.status);
        console.log("В зале: " + event.insideCount + "/" + event.max_capacity);
        console.log("Пользователь: " + user.login + " (" + user.role + ")");
        if (currentZone) {
            console.log("Текущая зона: " + currentZone);
        }
        console.log("================================");

        console.log("\n1. Сканировать билет");
        
        if (user.role === 'engineer') {
            console.log("2. Переключить событие");
            console.log("3. Создать новое событие");
            console.log("4. Журнал инцидентов");
            console.log("5. Регистрация нового сотрудника");
            console.log("6. Отчет об инциденте");
            console.log("7. Назначить зону сотруднику");
            console.log("8. Просмотр всех посетителей");
            console.log("9. Просмотр персонала");
        } else if (user.role === 'employee') {
            console.log("2. Отчет об инциденте");
        }
        
        console.log("0. Выйти из аккаунта");

        const choice = await this.rl.question("\nВыбор: ");
        const validChoices = user.role === 'engineer' ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : ['0', '1', '2'];
        
        if (!validChoices.includes(choice)) {
            console.log("[ОШИБКА] Неверный выбор. Попробуйте снова.");
            return;
        }

        if (choice === "1") {
            await this.scanTicket();
        } else if (choice === "2" && user.role === 'engineer') {
            await this.switchEvent();
        } else if (choice === "3" && user.role === 'engineer') {
            await this.createEventMenu();
        } else if (choice === "4" && user.role === 'engineer') {
            await this.viewIncidents();
        } else if (choice === "5" && user.role === 'engineer') {
            await this.registerNewUser();
        } else if (choice === "6" && user.role === 'engineer') {
            await this.reportIncidentMenu();
        } else if (choice === "7" && user.role === 'engineer') {
            await this.assignZoneToStaffMenu();
        } else if (choice === "8" && user.role === 'engineer') {
            await this.viewAllVisitors();
        } else if (choice === "9" && user.role === 'engineer') {
            await this.viewAllStaff();
        } else if (choice === "2" && user.role === 'employee') {
            await this.reportIncidentMenu();
        } else if (choice === "0") {
            this.logic.logout();
            console.log("[ОК] Вы вышли из системы.");
        }
    }

    async scanTicket() {
        const code = await this.rl.question("\nКод билета: ");
        const res = this.logic.processAccess(code);
        
        if (res.success) {
            console.log("[ОК] " + res.msg);
        } else {
            console.log("[ОШИБКА] " + res.msg);
            if (res.alert) {
                console.log("[ВНИМАНИЕ] Попытка несанкционированного доступа!");
            }
        }
    }

    async switchEvent() {
        console.log("\n--- ПЕРЕКЛЮЧЕНИЕ СОБЫТИЯ ---");
        const events = this.logic.getAllEvents();
        const currentEventId = this.logic.getCurrentEventId();
        
        events.forEach(e => {
            const current = e.id === currentEventId ? " [ТЕКУЩЕЕ]" : "";
            console.log(e.id + ". " + e.name + " - " + e.status + current);
        });

        let validEventSelected = false;
        while (!validEventSelected) {
            const eventIdStr = await this.rl.question("ID события: ");
            const eventId = parseInt(eventIdStr);
            
            if (isNaN(eventId) || !events.find(e => e.id === eventId)) {
                console.log("[ОШИБКА] Неверный ID события. Попробуйте снова.");
                continue;
            }

            const res = this.logic.switchEvent(eventId);
            
            if (res.success) {
                console.log("[ОК] Событие изменено.");
            } else {
                console.log("[ОШИБКА] Ошибка при переключении события.");
            }
            validEventSelected = true;
        }
    }

    async createEventMenu() {
        console.log("\n--- СОЗДАНИЕ НОВОГО СОБЫТИЯ ---");
        const name = await this.rl.question("Название события: ");
        
        let validCapacity = false;
        let max_capacity = 0;
        while (!validCapacity) {
            const capacityStr = await this.rl.question("Вместимость: ");
            max_capacity = parseInt(capacityStr);
            
            if (isNaN(max_capacity) || max_capacity <= 0) {
                console.log("[ОШИБКА] Введите положительное число.");
                continue;
            }
            validCapacity = true;
        }

        const zonesStr = await this.rl.question("Зоны (через запятую, например: Основной зал,VIP,Закулиса): ");
        const zones = zonesStr.split(',').map(z => z.trim());

        const res = this.logic.createEvent(name, zones, max_capacity);
        if (res.success) {
            console.log("[ОК] Событие создано с ID: " + res.eventId);
        } else {
            console.log("[ОШИБКА] Ошибка при создании события.");
        }
    }

    async viewIncidents() {
        console.log("\n--- ЖУРНАЛ ИНЦИДЕНТОВ ---");
        const incidents = this.logic.getIncidents();
        
        if (incidents.length === 0) {
            console.log("[ИНФОРМАЦИЯ] Инцидентов не зарегистрировано.");
            return;
        }

        console.table(incidents);
    }

    async reportIncidentMenu() {
        console.log("\n--- ОТЧЕТ ОБ ИНЦИДЕНТЕ ---");
        
        const eventZones = this.logic.getCurrentEventZones();
        let validTypeSelected = false;
        let incidentType = "";
        
        while (!validTypeSelected) {
            console.log("Тип инцидента:");
            console.log("1. Кража");
            console.log("2. Медицинское");
            console.log("3. Пожар");
            console.log("4. Солпотворение");
            
            const typeChoice = await this.rl.question("Выбор типа: ");
            const types = { "1": "Кража", "2": "Медицинское", "3": "Пожар", "4": "Солпотворение" };
            
            if (!types[typeChoice]) {
                console.log("[ОШИБКА] Неверный выбор типа. Попробуйте снова.");
                continue;
            }
            incidentType = types[typeChoice];
            validTypeSelected = true;
        }

        let validSeveritySelected = false;
        let severity = "";
        
        while (!validSeveritySelected) {
            console.log("\nСерьезность:");
            console.log("1. Низкая");
            console.log("2. Средняя");
            console.log("3. Высокая");
            
            const sevChoice = await this.rl.question("Выбор серьезности: ");
            const severities = { "1": "Низкая", "2": "Средняя", "3": "Высокая" };
            
            if (!severities[sevChoice]) {
                console.log("[ОШИБКА] Неверный выбор серьезности. Попробуйте снова.");
                continue;
            }
            severity = severities[sevChoice];
            validSeveritySelected = true;
        }

        let validZoneSelected = false;
        let zone = "";
        
        while (!validZoneSelected) {
            console.log("\nЗона:");
            eventZones.forEach((z, idx) => {
                console.log((idx + 1) + ". " + z);
            });
            
            const zoneChoice = await this.rl.question("Номер зоны: ");
            const zoneIdx = parseInt(zoneChoice) - 1;
            
            if (isNaN(zoneIdx) || zoneIdx < 0 || zoneIdx >= eventZones.length) {
                console.log("[ОШИБКА] Неверный номер зоны. Попробуйте снова.");
                continue;
            }
            zone = eventZones[zoneIdx];
            validZoneSelected = true;
        }

        const description = await this.rl.question("Описание инцидента: ");

        const res = this.logic.reportIncident(incidentType, severity, description, zone);
        
        if (res.success) {
            if (res.alert) {
                console.log("\n[ALERT] " + res.msg);
            } else {
                console.log("[ОК] Инцидент зарегистрирован.");
            }
        } else {
            console.log("[ОШИБКА] Ошибка при регистрации инцидента.");
        }
    }

    async registerNewUser() {
        console.log("\n--- РЕГИСТРАЦИЯ НОВОГО СОТРУДНИКА ---");
        const login = await this.rl.question("Логин: ");
        const pass = await this.rl.question("Пароль: ");
        
        let validRoleSelected = false;
        let role = "";
        
        while (!validRoleSelected) {
            console.log("1. employee (Сотрудник)");
            console.log("2. engineer (Инженер)");
            const roleChoice = await this.rl.question("Роль: ");
            const roles = { "1": "employee", "2": "engineer" };
            
            if (!roles[roleChoice]) {
                console.log("[ОШИБКА] Неверный выбор роли. Попробуйте снова.");
                continue;
            }
            role = roles[roleChoice];
            validRoleSelected = true;
        }

        if (this.logic.registerUser(login, pass, role)) {
            console.log("[ОК] Пользователь \"" + login + "\" зарегистрирован как " + role + ".");
        } else {
            console.log("[ОШИБКА] Ошибка при регистрации.");
        }
    }

    async assignZoneToStaffMenu() {
        console.log("\n--- НАЗНАЧЕНИЕ ЗОНЫ СОТРУДНИКУ ---");
        const eventZones = this.logic.getCurrentEventZones();
        const staffLogin = await this.rl.question("Логин сотрудника: ");

        console.log("\nДоступные зоны:");
        eventZones.forEach((zone, idx) => {
            console.log((idx + 1) + ". " + zone);
        });

        let validZoneSelected = false;
        let selectedZone = "";
        
        while (!validZoneSelected) {
            const choice = await this.rl.question("Номер зоны: ");
            const selectedZoneIdx = parseInt(choice) - 1;
            
            if (isNaN(selectedZoneIdx) || selectedZoneIdx < 0 || selectedZoneIdx >= eventZones.length) {
                console.log("[ОШИБКА] Неверный номер зоны. Попробуйте снова.");
                continue;
            }
            selectedZone = eventZones[selectedZoneIdx];
            validZoneSelected = true;
        }

        const res = this.logic.assignZoneToStaff(staffLogin, selectedZone);
        
        if (res.success) {
            console.log("[ОК] Сотруднику \"" + staffLogin + "\" назначена зона: " + selectedZone);
        } else {
            console.log("[ОШИБКА] Ошибка при назначении зоны.");
        }
    }

    async viewAllVisitors() {
        console.log("\n--- СПИСОК ВСЕХ ПОСЕТИТЕЛЕЙ ---");
        const visitors = this.logic.getAllVisitors();
        
        if (!visitors || visitors.length === 0) {
            console.log("[ИНФОРМАЦИЯ] Посетителей не найдено.");
            return;
        }

        const visitorsTable = visitors.map(v => ({
            "Код билета": v.ticket_code,
            "ФИО": v.owner_name,
            "Телефон": v.phone,
            "Зона": v.assigned_zone,
            "В зале": v.is_inside ? "Да" : "Нет"
        }));
        
        console.log("");
        console.table(visitorsTable);
    }

    async viewAllStaff() {
        console.log("\n--- СПИСОК ПЕРСОНАЛА ---");
        const staff = this.logic.getAllStaff();
        
        if (!staff || staff.length === 0) {
            console.log("[ИНФОРМАЦИЯ] Персонал не найден.");
            return;
        }

        const staffTable = staff.map(u => ({
            "Логин": u.login,
            "Роль": u.role === "engineer" ? "Инженер" : "Сотрудник",
            "Назначена зона": u.assigned_zone || "-",
            "События ID": u.assigned_event_id || "-"
        }));
        
        console.log("");
        console.table(staffTable);
    }
}

module.exports = PresentationLayer;