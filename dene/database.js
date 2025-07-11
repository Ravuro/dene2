// database.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false, // Konsolu temiz tutmak için SQL sorgularını loglama
});

// Ayarları (anahtar-değer çiftleri) saklamak için kullanılır.
const Settings = sequelize.define('Settings', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.JSON }
});

// Rol verme/alma işlemlerini loglamak için.
const RoleLog = sequelize.define('RoleLog', {
    userId: { type: DataTypes.STRING, allowNull: false },
    moderatorId: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // 'verildi' veya 'alındı'
});

// Tüm cezaları (ban, uyarı vb.) saklamak için.
const Punishment = sequelize.define('Punishment', {
    userId: { type: DataTypes.STRING, allowNull: false },
    moderatorId: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    duration: { type: DataTypes.STRING, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Yetkililerin mesai sürelerini takip etmek için.
const Mesai = sequelize.define('Mesai', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    onShift: { type: DataTypes.BOOLEAN, defaultValue: false },
    startTime: { type: DataTypes.DATE, allowNull: true },
    totalTime: { type: DataTypes.BIGINT, defaultValue: 0 }
});

// Oluşum/ekip bilgilerini saklamak için.
const Olusum = sequelize.define('Olusum', {
    name: { type: DataTypes.STRING, unique: true },
    leaderId: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.STRING, unique: true },
    categoryChannelId: { type: DataTypes.STRING, unique: true, allowNull: true },
    applicationChannelId: { type: DataTypes.STRING, unique: true, allowNull: true },
    chatChannelId: { type: DataTypes.STRING, unique: true, allowNull: true },
    emoji: { type: DataTypes.STRING, allowNull: true } // YENİ EKLENDİ
});

// Guard sisteminden muaf olan yetkilileri saklamak için.
const GuardWhitelist = sequelize.define('GuardWhitelist', {
    userId: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
}, {
    indexes: [{
        unique: true,
        fields: ['userId', 'action']
    }]
});

// Çekilişleri veritabanında saklamak için.
const Giveaways = sequelize.define('Giveaways', {
    messageId: { type: DataTypes.STRING, primaryKey: true },
    channelId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
    prize: { type: DataTypes.STRING, allowNull: false },
    winnerCount: { type: DataTypes.INTEGER, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: false },
    ended: { type: DataTypes.BOOLEAN, defaultValue: false },
    winners: { type: DataTypes.JSON, defaultValue: [] }
});

// Destek taleplerini (ticket) saklamak için.
const Tickets = sequelize.define('Tickets', {
    channelId: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
    categoryId: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'open' },
    claimedBy: { type: DataTypes.STRING, allowNull: true },
    closeReason: { type: DataTypes.TEXT, allowNull: true },
});

// Ticket kategorilerini saklamak için.
const TicketCategories = sequelize.define('TicketCategories', {
    categoryId: { type: DataTypes.STRING, primaryKey: true },
    guildId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    supportRoleId: { type: DataTypes.STRING, allowNull: false },
    emoji: { type: DataTypes.STRING, allowNull: true },
    style: { type: DataTypes.STRING, defaultValue: 'Secondary' },
});

// Ticket puanlamalarını saklamak için.
const TicketRatings = sequelize.define('TicketRatings', {
    ticketId: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    staffId: { type: DataTypes.STRING, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
});

// Whitelist kayıtlarını ve istatistiklerini tutmak için.
const Registrations = sequelize.define('Registrations', {
    staffId: { type: DataTypes.STRING, allowNull: false },
    registeredUserId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
});


module.exports = {
    sequelize,
    Settings,
    RoleLog,
    Punishment,
    Mesai,
    Olusum,
    GuardWhitelist,
    Giveaways,
    Tickets,
    TicketCategories,
    TicketRatings,
    Registrations,
};
