class DataAccessLayer {
    constructor() {
        this.users = [
            { login: "admin", password: "123", role: "engineer" },
            { login: "staff", password: "111", role: "employee" }
        ];

        this.tickets = [
            { ticket_code: "T1", owner_name: "Иван Петров", phone: "+7-900-123-45-67", is_inside: false, event_name: "Осенний фестиваль", assigned_zone: "Основной зал", event_max_capacity: 5 },
            { ticket_code: "T2", owner_name: "Александр Смирнов", phone: "+7-901-234-56-78", is_inside: false, event_name: "Осенний фестиваль", assigned_zone: "VIP", event_max_capacity: 5 },
            { ticket_code: "T3", owner_name: "Олег Окунев", phone: "+7-902-345-67-89", is_inside: false, event_name: "Конференция безопасности", assigned_zone: "Главный зал", event_max_capacity: 3 }
        ];

        this.incidents = [];
        this.incidentIdCounter = 1;
    }

    findUser(login) {
        return this.users.find(u => u.login === login);
    }

    saveUser(login, password, role) {
        this.users.push({ login, password, role });
    }

    getStaff() {
        return this.users.filter(u => u.role === "employee" || u.role === "engineer");
    }

    getTicket(code) {
        return this.tickets.find(t => t.ticket_code === code);
    }

    getAllTickets() {
        return this.tickets;
    }

    addTicket(ticket_code, owner_name, phone, event_name, assigned_zone, event_max_capacity) {
        if (this.getTicket(ticket_code)) return null;
        const ticket = { ticket_code, owner_name, phone, is_inside: false, event_name, assigned_zone, event_max_capacity };
        this.tickets.push(ticket);
        return ticket;
    }

    markTicketInside(code) {
        const t = this.getTicket(code);
        if (t) t.is_inside = true;
        return t;
    }

    getInsideCountForEvent(event_name) {
        return this.tickets.filter(t => t.event_name === event_name && t.is_inside).length;
    }

    saveIncident(type, severity, description, reporter_login) {
        const inc = { id: this.incidentIdCounter++, type, severity, description, timestamp: new Date().toISOString(), reporter_login };
        this.incidents.push(inc);
        return inc;
    }

    getIncidents() {
        return this.incidents;
    }
}

module.exports = DataAccessLayer;
