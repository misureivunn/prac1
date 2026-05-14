class BusinessLogicLayer {
    constructor(data) {
        this.data = data;
        this.currentUser = null;
        // store staff's active working zone per session (not stored in User entity)
        this.currentUserZone = null;
    }

    authenticate(login, password) {
        const user = this.data.findUser(login);
        if (user && user.password === password) {
            this.currentUser = user;
            this.currentUserZone = null;
            return { success: true, role: user.role };
        }
        return { success: false };
    }

    setStaffZone(zone) {
        this.currentUserZone = zone;
    }

    getStaffZone() {
        return this.currentUserZone;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Access processing using denormalized ticket/event data
    processAccess(ticketCode) {
        const ticket = this.data.getTicket(ticketCode);
        const currentZone = this.getStaffZone();

        // Check 1: Ticket exists
        if (!ticket) {
            this.data.saveIncident("Access", "Low", "Unknown ticket: " + ticketCode, this.currentUser?.login);
            return { success: false, msg: "Билет не найден" };
        }

        // Check 2: Already inside
        if (ticket.is_inside) {
            this.data.saveIncident("Security", "High", "Duplicate entry: " + ticketCode, this.currentUser?.login);
            return { success: false, msg: "Повторный вход", alert: true };
        }

        // Check 3: Capacity for the event
        const insideCount = this.data.getInsideCountForEvent(ticket.event_name);
        if (insideCount >= ticket.event_max_capacity) {
            this.data.saveIncident("Access", "Low", "Capacity exceeded for event: " + ticket.event_name, this.currentUser?.login);
            return { success: false, msg: "Нет мест" };
        }

        // Check 4: Zone match (if staff set a zone)
        if (currentZone && ticket.assigned_zone !== currentZone) {
            this.data.saveIncident("Security", "High", "Zone mismatch for ticket " + ticketCode + ": expected " + ticket.assigned_zone + ", scanned at " + currentZone, this.currentUser?.login);
            return { success: false, msg: "Доступ запрещен: билет для зоны \"" + ticket.assigned_zone + "\"", alert: true };
        }

        // All good — mark inside
        this.data.markTicketInside(ticketCode);
        return { success: true, msg: "Вход разрешен", zone: ticket.assigned_zone };
    }

    // Engineer-only: register new ticket
    registerTicket(ticket_code, owner_name, phone, event_name, assigned_zone, event_max_capacity) {
        if (this.currentUser?.role !== 'engineer') return { success: false };
        const t = this.data.addTicket(ticket_code, owner_name, phone, event_name, assigned_zone, event_max_capacity);
        if (!t) return { success: false, msg: 'Ticket exists' };
        return { success: true, ticket: t };
    }

    registerUser(login, pass, role) {
        if (this.currentUser?.role !== 'engineer') return { success: false };
        this.data.saveUser(login, pass, role);
        return { success: true };
    }

    reportIncident(type, severity, description) {
        if (!this.currentUser) return { success: false };
        const inc = this.data.saveIncident(type, severity, description, this.currentUser.login);
        return { success: true, incident: inc, alert: severity === 'High' };
    }

    getIncidents() {
        return this.data.getIncidents();
    }

    getAllTickets() {
        if (this.currentUser?.role !== 'engineer') return null;
        return this.data.getAllTickets();
    }

    getAllStaff() {
        if (this.currentUser?.role !== 'engineer') return null;
        return this.data.getStaff();
    }

    logout() {
        this.currentUser = null;
        this.currentUserZone = null;
    }
}

module.exports = BusinessLogicLayer;
