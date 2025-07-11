// commands/yonetim/kurulum.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

// Kurulumda kontrol edilecek tüm ayarların merkezi listesi (Güvenlik Log eklendi)
const setupItems = [
    // Kanallar
    { key: 'hgbbChannel', name: 'giden-gelen', type: 'channel', group: 'channel', icon: '👋' },
    { key: 'otorolLog', name: 'oto-rol-log', type: 'channel', group: 'channel', icon: '🔄', statusKey: 'otorolStatus' },
    { key: 'guvenlikLogChannel', name: 'güvenlik-log', type: 'channel', group: 'channel', icon: '🛡️', statusKey: 'guvenlikStatus' }, // YENİ
    { key: 'davetLogChannel', name: 'davet-log', type: 'channel', group: 'channel', icon: '✉️' },
    { key: 'sesLog', name: 'ses-log', type: 'channel', group: 'channel', icon: '🎤' },
    { key: 'modLog', name: 'mod-log', type: 'channel', group: 'channel', icon: '📝' },
    { key: 'kufurEngelLog', name: 'küfür-log', type: 'channel', group: 'channel', icon: '🤬', statusKey: 'kufurEngelStatus' },
    { key: 'reklamEngelLog', name: 'reklam-log', type: 'channel', group: 'channel', icon: '🚫', statusKey: 'reklamEngelStatus' },
    { key: 'rol-verme-log-kanal', name: 'rol-verme-log', type: 'channel', group: 'channel', icon: '📜' },
    { key: 'rol-alma-log-kanal', name: 'rol-alma-log', type: 'channel', group: 'channel', icon: '🛠️' },
    { key: 'ticketLog', name: 'ticket-log', type: 'channel', group: 'channel', icon: '🎟️' },
    { key: 'banLogChannel', name: 'ban-log', type: 'channel', group: 'channel', icon: '🔨' },
    { key: 'kickLogChannel', name: 'kick-log', type: 'channel', group: 'channel', icon: '👢' },
    { key: 'uyariLogChannel', name: 'uyarı-log', type: 'channel', group: 'channel', icon: '⚠️' },
    { key: 'kayitLog', name: 'kayıt-log', type: 'channel', group: 'channel', icon: '👤' },
    { key: 'olusumLog', name: 'oluşum-log', type: 'channel', group: 'channel', icon: '👥' },
    { key: 'mesaiLog', name: 'mesai-log', type: 'channel', group: 'channel', icon: '⏰' },
    { key: 'botKomutLog', name: 'bot-komut', type: 'channel', group: 'channel', icon: '🤖' },
    
    // Roller
    { key: 'otorolRole', name: 'Otorol Rolü', type: 'role', group: 'role' },
    { key: 'yetkiliRol', name: 'Genel Yetkili Rolü', type: 'role', group: 'role' },
    { key: 'icIsimRole', name: 'IC İsim Onay Rolü', type: 'role', group: 'role' },
];

// Mevcut kurulum durumunu kontrol eden fonksiyon
async function checkSetup() {
    const keysToCheck = setupItems.map(k => k.key).concat(setupItems.filter(k => k.statusKey).map(k => k.statusKey));
    const settings = await Settings.findAll({ where: { key: keysToCheck } });
    const status = {};
    for (const item of setupItems) {
        const setting = settings.find(s => s.key === item.key);
        let statusText = setting ? `✅ Ayarlı (<${item.type === 'channel' ? '#' : '@&'}${setting.value}>)` : '❌ Ayarlanmamış';
        
        if (item.statusKey) {
            const statusSetting = settings.find(s => s.key === item.statusKey)?.value ?? false;
            statusText += ` - Durum: ${statusSetting ? 'Açık' : 'Kapalı'}`;
        }
        status[item.key] = statusText;
    }
    return status;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kurulum')
        .setDescription('Bot için gerekli tüm kanal ve rolleri otomatik olarak kurar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const currentStatus = await checkSetup();
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Kurulum Yardımcısı')
            .setColor('#3498DB')
            .setDescription('Bu panel, botun çalışması için gerekli olan tüm temel kanal ve rolleri kontrol eder ve kurar. Aşağıdaki butonları kullanarak eksik kurulumları tamamlayabilirsiniz.')
            .addFields(
                setupItems.map(item => ({
                    name: `${item.icon || ''} ${item.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                    value: currentStatus[item.key],
                    inline: true
                }))
            );
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('kurulum_kanallar').setLabel('Log Kanallarını Kur ve Aktif Et').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('kurulum_roller').setLabel('Gerekli Rolleri Kur').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('kurulum_sifirla').setLabel('Tüm Ayarları Sıfırla').setStyle(ButtonStyle.Danger)
            );
        await interaction.editReply({ embeds: [embed], components: [row] });
    },
    setupItems,
    checkSetup
};
