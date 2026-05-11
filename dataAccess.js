class DataAccessLayer {
    constructor() {
        this.users = [
            { login: "admin", password: "123", role: "engineer", assigned_zone: null, assigned_event_id: null },
            { login: "staff", password: "111", role: "employee", assigned_zone: "Основной зал", assigned_event_id: 1 }
        ];
        
        // Поддержка нескольких мероприятий с зонами
        this.events = [
            { id: 1, name: "Осенний фестиваль", zones: ["Основной зал", "VIP", "Закулиса"], max_capacity: 5, status: "Активное" },
            { id: 2, name: "Конференция безопасности", zones: ["Главный зал", "Мастерская", "Бар"], max_capacity: 3, status: "Завершено" }
        ];
        this.currentEventId = 1; // Default active event
        
        this.visitors = [
            { id: 1, ticket_code: "T1", event_id: 1, owner_name: "Иван Петров", phone: "+7-900-123-45-67", assigned_zone: "Основной зал", is_inside: false },
            { id: 2, ticket_code: "T2", event_id: 1, owner_name: "Александр Смирнов", phone: "+7-901-234-56-78", assigned_zone: "VIP", is_inside: false },
            { id: 3, ticket_code: "T3", event_id: 2, owner_name: "Олег Окунев", phone: "+7-902-345-67-89", assigned_zone: "Главный зал", is_inside: false }
        ];
        
        this.incidents = [];
        this.incidentIdCounter = 1;
    }

    // User methods
    findUser(login) {
        return this.users.find(u => u.login === login);
    }
    
    saveUser(login, password, role) {
        this.users.push({ login, password, role, assigned_zone: null, assigned_event_id: null });
    }

    assignZoneToUser(login, zone, eventId) {
        const user = this.findUser(login);
        if (user && (user.role === 'employee' || user.role === 'engineer')) {
            user.assigned_zone = zone;
            user.assigned_event_id = eventId;
            return true;
        }
        return false;
    }

    getUserZoneForEvent(login, eventId) {
        const user = this.findUser(login);
        if (user && user.assigned_event_id === eventId) {
            return user.assigned_zone;
        }
        return null;
    }

    // Event methods
    getEvent(eventId = this.currentEventId) {
        return this.events.find(e => e.id === eventId);
    }
    
    getAllEvents() {
        return this.events;
    }
    
    setCurrentEvent(eventId) {
        if (this.events.find(e => e.id === eventId)) {
            this.currentEventId = eventId;
            return true;
        }
        return false;
    }
    
    createEvent(name, zones, max_capacity) {
        const newId = Math.max(...this.events.map(e => e.id), 0) + 1;
        this.events.push({ 
            id: newId, 
            name, 
            zones, 
            max_capacity, 
            status: "Активное" 
        });
        return newId;
    }

    // Visitor methods
    getVisitor(code, eventId = this.currentEventId) {
        return this.visitors.find(v => v.ticket_code === code && v.event_id === eventId);
    }
    
    getAllVisitors(eventId = this.currentEventId) {
        return this.visitors.filter(v => v.event_id === eventId);
    }
    
    addVisitor(ticket_code, event_id, owner_name, phone, assigned_zone) {
        const newId = Math.max(...this.visitors.map(v => v.id), 0) + 1;
        this.visitors.push({
            id: newId,
            ticket_code,
            event_id,
            owner_name,
            phone,
            assigned_zone,
            is_inside: false
        });
        return newId;
    }
    
    getInsideCount(eventId = this.currentEventId) {
        return this.visitors.filter(v => v.event_id === eventId && v.is_inside).length;
    }

    // Incident methods
    saveIncident(type, severity, description, zone, reporter_login) {
        this.incidents.push({ 
            id: this.incidentIdCounter++,
            type, 
            severity, 
            description, 
            zone,
            timestamp: new Date().toLocaleString(),
            reporter_login,
            event_id: this.currentEventId
        });
    }

    // Staff/Personnel methods
    getStaff() {
        return this.users.filter(u => u.role === "employee" || u.role === "engineer");
    }

    getStaffByRole(role) {
        return this.users.filter(u => u.role === role);
    }
}

module.exports = DataAccessLayer;