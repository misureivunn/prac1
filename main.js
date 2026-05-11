const DataAccessLayer = require('./dataAccess');
const BusinessLogicLayer = require('./businessLogic');
const PresentationLayer = require('./present');

// Делаем main асинхронной
async function main() {
    const dataLayer = new DataAccessLayer();
    const businessLayer = new BusinessLogicLayer(dataLayer);
    const presentationLayer = new PresentationLayer(businessLayer);
    
    // Запускаем и ждем
    await presentationLayer.run();
}

if (require.main === module) {
    main().catch(err => console.error(err));
}