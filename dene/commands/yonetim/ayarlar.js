// commands/yonetim/ayarlar.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Settings } = require('../../database');

// Yönetilebilecek tüm ayarların merkezi listesi
const allOptions = [
    // Genel Ayarlar
    { name: 'sunucu-ismi', description: 'Sunucu ismini ayarlar.', type: 'String', group: 'Genel' },
    { name: 'sunucu-ip', description: 'Sunucu IP adresini ayarlar.', type: 'String', group: 'Genel' },
    { name: 'cfx-kodu', description: 'FiveM CFX bağlantı kodunu ayarlar.', type: 'String', group: 'Genel' },
    { name: 'ts3-ip', description: 'TeamSpeak 3 IP adresini ayarlar.', type: 'String', group: 'Genel' },
    { name: 'discord-davet', description: 'Discord davet linkini ayarlar.', type: 'String', group: 'Genel' },
    { name: 'sunucu-website', description: 'Duyurularda/Loglarda görünecek web sitesi.', type: 'String', group: 'Genel' },
    // Duyuru Resimleri
    { name: 'aktif-resim', description: 'Aktif duyurusu için resim URL\'si.', type: 'String', group: 'Duyuru' },
    { name: 'bakim-resim', description: 'Bakım duyurusu için resim URL\'si.', type: 'String', group: 'Duyuru' },
    { name: 'restart-resim', description: 'Restart duyurusu için resim URL\'si.', type: 'String', group: 'Duyuru' },
    // Yetki Rolleri
    { name: 'rol-yetki', description: 'Rol verme/alma yetkisine sahip rol.', type: 'Role', group: 'Yetki' },
    { name: 'ban-yetki', description: 'Ban atma yetkisine sahip rol.', type: 'Role', group: 'Yetki' },
    { name: 'kick-yetki', description: 'Kick atma yetkisine sahip rol.', type: 'Role', group: 'Yetki' },
    { name: 'destek-yetkili-rol', description: 'Destek ekibi rolü.', type: 'Role', group: 'Yetki' },
    { name: 'kayit-yetkili-rol', description: 'Kayıt yetkilisi rolü.', type: 'Role', group: 'Yetki' },
    { name: 'wl-kayitli-rol', description: 'Whitelist kayıt sonrası verilecek rol.', type: 'Role', group: 'Yetki' }, // YENİ EKLENDİ
    { name: 'wl-kayitsiz-rol', description: 'Whitelist kayıtsız rolü (kayıt sonrası alınacak).', type: 'Role', group: 'Yetki' }, // YENİ EKLENDİ
    // Log Kanalları
    { name: 'rol-verme-log', description: 'Rol verme işlemlerini loglar.', type: 'Channel', group: 'Log' },
    { name: 'rol-alma-log', description: 'Rol alma işlemlerini loglar.', type: 'Channel', group: 'Log' },
    { name: 'kanal-log', description: 'Kanal değişikliklerini loglar.', type: 'Channel', group: 'Log' },
    { name: 'ban-log', description: 'Ban loglarının gönderileceği kanal.', type: 'Channel', group: 'Log' },
    { name: 'kick-log', description: 'Kick loglarının gönderileceği kanal.', type: 'Channel', group: 'Log' },
    // Sistem Durumları (Açık/Kapalı)
    { name: 'reklam-engel-durum', description: 'Reklam engelleme sistemini açar/kapatır.', type: 'Boolean', group: 'Sistem' },
    { name: 'kufur-engel-durum', description: 'Küfür engelleme sistemini açar/kapatır.', type: 'Boolean', group: 'Sistem' },
    { name: 'guvenlik-durum', description: 'Yeni hesap güvenlik denetimini açar/kapatır.', type: 'Boolean', group: 'Sistem' },
];

const builder = new SlashCommandBuilder()
    .setName('ayarlar')
    .setDescription('Tüm bot ayarlarını yönetir veya görüntüler.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

allOptions.forEach(option => {
    const optionName = option.name.replace(/-/g, '_');
    switch (option.type) {
        case 'String': builder.addStringOption(opt => opt.setName(optionName).setDescription(option.description).setRequired(false)); break;
        case 'Role': builder.addRoleOption(opt => opt.setName(optionName).setDescription(option.description).setRequired(false)); break;
        case 'Channel': builder.addChannelOption(opt => opt.setName(optionName).setDescription(option.description).setRequired(false)); break;
        case 'Boolean': builder.addBooleanOption(opt => opt.setName(optionName).setDescription(option.description).setRequired(false)); break;
    }
});

module.exports = {
    data: builder,
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const updates = [];
        // YENİ: Tüm girilen opsiyonları bul ve bir diziye ekle
        for (const opt of allOptions) {
            const optionName = opt.name.replace(/-/g, '_');
            const optionData = interaction.options.get(optionName);
            if (optionData !== null && optionData !== undefined) {
                updates.push({
                    key: opt.name,
                    value: optionData.value,
                    displayValue: optionData.role?.toString() || optionData.channel?.toString() || optionData.value.toString()
                });
            }
        }

        // Eğer güncellenecek bir ayar varsa, hepsini güncelle
        if (updates.length > 0) {
            try {
                // Tüm güncellemeleri veritabanına işle
                for (const update of updates) {
                    await Settings.upsert({ key: update.key, value: update.value });
                }
                // Başarılı olan tüm güncellemeleri tek bir mesajda bildir
                const successMessage = updates.map(u => `✅ **${u.key.replace(/-/g, ' ')}** ayarı, **${u.displayValue}** olarak güncellendi.`).join('\n');
                await interaction.editReply(successMessage);
            } catch (error) {
                console.error(error);
                await interaction.followUp({ content: 'Ayarlar güncellenirken bir hata oluştu.', flags: MessageFlags.Ephemeral });
            }
        } 
        // Eğer hiçbir ayar girilmediyse, paneli göster
        else {
            const allSettings = await Settings.findAll();
            const getSetting = (key) => allSettings.find(s => s.key === key)?.value;

            const embed = new EmbedBuilder()
                .setTitle('Ana Kontrol Paneli')
                .setColor('#2C2F33')
                .setAuthor({ name: `${interaction.guild.name} | Bot Ayarları`, iconURL: interaction.guild.iconURL() });
            
            const groups = ['Genel', 'Duyuru', 'Yetki', 'Log', 'Sistem'];
            for (const groupName of groups) {
                const groupOptions = allOptions.filter(o => o.group === groupName);
                if (groupOptions.length > 0) {
                    const description = groupOptions.map(opt => {
                        const value = getSetting(opt.name);
                        let displayValue = '❌ Ayarlanmamış';
                        if (value !== null && value !== undefined) {
                            if (opt.type === 'Role') displayValue = `<@&${value}>`;
                            else if (opt.type === 'Channel') displayValue = `<#${value}>`;
                            else if (opt.type === 'Boolean') displayValue = value ? '✅ Açık' : '🅾️ Kapalı';
                            else displayValue = `\`${value}\``;
                        }
                        return `**${opt.name.replace(/-/g, ' ')}:** ${displayValue}`;
                    }).join('\n');
                    embed.addFields({ name: `**${groupName} Ayarları**`, value: description, inline: groupName.length < 10 });
                }
            }

            await interaction.editReply({ embeds: [embed] });
        }
    },
};
