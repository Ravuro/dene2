// commands/yonetim/rol-kurulum.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, MessageFlags } = require('discord.js');

// Oluşturulacak roller, yetkileri ve renkleri
const roleHierarchy = [
    // Ayraçlar (Separator)
    { name: '——————[Üst Yönetim]——————', type: 'separator' },
    // Yönetim
    { name: '👑 | Owner', color: '#FFD700', permissions: ['ban-yetki', 'kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Director', color: '#C27C0E', permissions: ['ban-yetki', 'kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Supervisor', color: '#A84300', permissions: ['ban-yetki', 'kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Community Management', color: '#1F8B4C', permissions: ['kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Management', color: '#F1C40F', permissions: ['kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    // Ayraç
    { name: '——————[Yönetim]——————', type: 'separator' },
    { name: 'Head Admin', color: '#E74C3C', permissions: ['ban-yetki', 'kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Admin', color: '#3498DB', permissions: ['ban-yetki', 'kick-yetki', 'rol-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Trial Game Staff', color: '#E91E63', permissions: ['kick-yetki', 'destek-yetkili-rol'] },
    // Staff
    { name: 'Staff L4', color: '#99AAB5', permissions: ['kick-yetki', 'destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Staff L3', color: '#979C9F', permissions: ['destek-yetkili-rol', 'kayit-yetkili-rol'] },
    { name: 'Staff L2', color: '#607D8B', permissions: ['destek-yetkili-rol'] },
    { name: 'Staff L1', color: '#546E7A', permissions: ['destek-yetkili-rol'] },
    // Sorumlular
    { name: 'Yetkili Sorumlusu', color: '#D32F2F', permissions: ['rol-yetki'] },
    { name: 'İllegal Rol Sorumlusu', color: '#7B1FA2', permissions: ['rol-yetki'] },
    { name: 'Etkinlik Sorumlusu', color: '#FF6F00', permissions: [] },
    // Ayraç
    { name: '——————[Özel]——————', type: 'separator' },
    // Özel
    { name: 'Ban Hammer', color: '#000000', permissions: ['ban-yetki'] },
    { name: 'Emektar', color: '#FBC02D', permissions: [] },
    { name: 'Developer', color: '#424242', permissions: [] },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-kurulum')
        .setDescription('Gelişmiş FiveM yetki hiyerarşisini otomatik olarak kurar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Gelişmiş Rol Kurulumu')
            .setColor('#F1C40F')
            .setDescription(
                'Bu işlem, sunucunuzda standart FiveM yetki hiyerarşisine göre **' + roleHierarchy.length + ' adet** yeni rol ve ayraç oluşturacak, ardından bu rollere bot komut yetkilerini atayacaktır.\n\n' +
                'Mevcut aynı isimdeki roller etkilenmeyecektir. Bu işlemi yapmak istediğinizden emin misiniz?'
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rolkurulum_onayla')
                    .setLabel('Onayla ve Kurulumu Başlat')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rolkurulum_iptal')
                    .setLabel('İptal Et')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    },
    roleHierarchy, // Bu listeyi interactionCreate dosyasından erişmek için export ediyoruz
};
