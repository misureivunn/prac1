class BusinessLogicLayer {
    constructor(data) {
        this.data = data;
        this.currentUser = null;
    }

    authenticate(login, password) {
        const user = this.data.findUser(login);
        if (user && user.password === password) {
            this.currentUser = user;
            return { success: true, role: user.role };
        }
        return { success: false };
    }

    getStaffZone() {
        if (this.currentUser) {
            const event = this.data.getEvent();
            return this.data.getUserZoneForEvent(this.currentUser.login, event.id);
        }
        return null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentEventId() {
        const event = this.data.getEvent();
        return event ? event.id : null;
    }

    getInsideCount() {
        return this.data.getInsideCount();
    }

    // Zone assignment by admin
    assignZoneToStaff(staffLogin, zone) {
        if (this.currentUser?.role !== 'engineer') return { success: false };
        const event = this.data.getEvent();
        if (this.data.assignZoneToUser(staffLogin, zone, event.id)) {
            return { success: true };
        }
        return { success: false };
    }

    // Event Management
    createEvent(name, zones, max_capacity) {
        if (this.currentUser?.role !== 'engineer') return { success: false };
        const eventId = this.data.createEvent(name, zones, max_capacity);
        return { success: true, eventId };
    }

    switchEvent(eventId) {
        if (this.currentUser?.role !== 'engineer') return { success: false };
        if (this.data.setCurrentEvent(eventId)) {
            return { success: true };
        }
        return { success: false };
    }

    getCurrentEvent() {
        return this.data.getEvent();
    }

    getCurrentEventSummary() {
        const event = this.data.getEvent();
        if (!event) {
            return null;
        }

        return {id: event.id, name: event.name, status: event.status, max_capacity: event.max_capacity, insideCount: this.data.getInsideCount(event.id)};
    }

    getCurrentEventZones() {
        const event = this.data.getEvent();
        return event ? event.zones : [];
    }

    getAllEvents() {
        return this.data.getAllEvents();
    }

    // Advanced Access Control with Zone Checking
    processAccess(ticketCode) {
        const event = this.data.getEvent();
        const visitor = this.data.getVisitor(ticketCode);
        const currentZone = this.getStaffZone();

        // Check 1: Event active
        if (event.status !== "Активное") {
            this.data.saveIncident("Доступ", "Средняя", "Событие неактивно", currentZone || "Неизвестно", this.currentUser?.login);
            return { success: false, msg: "Событие завершено" };
        }

        // Check 2: Ticket exists
        if (!visitor) {
            this.data.saveIncident("Безопасность", "Средняя", "Неизвестный билет: " + ticketCode, currentZone || "Неизвестно", this.currentUser?.login);
            return { success: false, msg: "Билет не найден" };
        }

        // Check 3: Not already inside
        if (visitor.is_inside) {
            this.data.saveIncident("Безопасность", "Высокая", "Двойной вход: " + ticketCode, visitor.assigned_zone, this.currentUser?.login);
            return { success: false, msg: "Повторный вход", alert: true };
        }

        // Check 4: Capacity available
        if (this.data.getInsideCount() >= event.max_capacity) {
            this.data.saveIncident("Доступ", "Средняя", "Вместимость превышена", currentZone || "Неизвестно", this.currentUser?.login);
            return { success: false, msg: "Нет мест" };
        }

        // Check 5: Zone match
        if (currentZone && visitor.assigned_zone !== currentZone) {
            this.data.saveIncident("Безопасность", "Высокая", "Несоответствие зон: билет для " + visitor.assigned_zone + ", сканирован в " + currentZone, currentZone, this.currentUser?.login);
            return { success: false, msg: "Доступ запрещен: билет для зоны \"" + visitor.assigned_zone + "\"", alert: true };
        }

        // All checks passed
        visitor.is_inside = true;
        return { success: true, msg: "Вход разрешен", zone: visitor.assigned_zone };
    }

    registerUser(login, pass, role) {
        if (this.currentUser?.role !== 'engineer') return false;
        this.data.saveUser(login, pass, role);
        return true;
    }

    // Manual Incident Reporting
    reportIncident(type, severity, description, zone) {
        if (!this.currentUser || (this.currentUser.role !== 'employee' && this.currentUser.role !== 'engineer')) {
            return { success: false };
        }
        
        this.data.saveIncident(type, severity, description, zone, this.currentUser.login);
        const shouldAlert = severity === "Высокая";
        
        return { 
            success: true, 
            alert: shouldAlert,
            msg: shouldAlert ? "[ALERT] " + type + " - " + severity + " в " + zone : undefined
        };
    }

    getIncidents() {
        return this.data.incidents;
    }

    // Audit methods
    getAllVisitors() {
        if (this.currentUser?.role !== 'engineer') return null;
        const event = this.data.getEvent();
        return this.data.getAllVisitors(event.id);
    }

    getAllStaff() {
        if (this.currentUser?.role !== 'engineer') return null;
        return this.data.getStaff();
    }

    logout() {
        this.currentUser = null;
    }
}

module.exports = BusinessLogicLayer;