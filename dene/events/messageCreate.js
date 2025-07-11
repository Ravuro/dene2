// events/messageCreate.js
const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Settings } = require('../database');

// Yasaklı kelimeler listesi (genişletilebilir)
const yasakliKelimeler = ['aptal', 'salak', 'gerizekalı', 'amk', 'oç', 'piç'];

/**
 * Reklamları (Discord davet linkleri) denetler ve engeller.
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>} Reklam bulunup işlem yapıldıysa true döner.
 */
async function handleReklam(message, client) {
    const reklamEngelStatus = (await Settings.findOne({ where: { key: 'reklam-engel-durum' } }))?.value ?? false;
    if (!reklamEngelStatus) return false;

    const reklamRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
    if (reklamRegex.test(message.content)) {
        await message.delete();
        const warningMessage = await message.channel.send(`${message.author}, bu sunucuda reklam yapmak yasaktır!`);
        setTimeout(() => warningMessage.delete().catch(console.error), 5000);

        const logChannelId = (await Settings.findOne({ where: { key: 'reklam-log' } }))?.value;
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#E74C3C').setTitle('Reklam Tespit Edildi')
                    .setDescription(`Bir kullanıcı reklam yapmaya çalıştı ve mesajı silindi.`)
                    .addFields(
                        { name: 'Kullanıcı', value: message.author.toString(), inline: true },
                        { name: 'Kanal', value: message.channel.toString(), inline: true },
                        { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\`` }
                    ).setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        return true;
    }
    return false;
}

/**
 * Küfürlü kelimeleri denetler ve engeller.
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>} Küfür bulunup işlem yapıldıysa true döner.
 */
async function handleKufur(message, client) {
    const kufurEngelStatus = (await Settings.findOne({ where: { key: 'kufur-engel-durum' } }))?.value ?? false;
    if (!kufurEngelStatus) return false;

    const content = message.content.toLowerCase().replace(/ /g, '');
    const foundKufur = yasakliKelimeler.some(kelime => content.includes(kelime));

    if (foundKufur) {
        await message.delete();
        const warningMessage = await message.channel.send(`${message.author}, lütfen sohbet diline dikkat et!`);
        setTimeout(() => warningMessage.delete().catch(console.error), 5000);

        const logChannelId = (await Settings.findOne({ where: { key: 'küfür-log' } }))?.value;
        if (logChannelId) {
            const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#F1C40F').setTitle('Küfür Tespit Edildi')
                    .setDescription(`Bir kullanıcı küfürlü bir kelime kullandı ve mesajı silindi.`)
                    .addFields(
                        { name: 'Kullanıcı', value: message.author.toString(), inline: true },
                        { name: 'Kanal', value: message.channel.toString(), inline: true },
                        { name: 'Mesaj İçeriği', value: `\`\`\`${message.content}\`\`\`` }
                    ).setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        return true;
    }
    return false;
}

/**
 * IC İsim başvurularını yönetir.
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>} Başvuru yapıldıysa true döner.
 */
async function handleIcIsim(message, client) {
    const icIsimChannelId = (await Settings.findOne({ where: { key: 'ic-isim-kanal' } }))?.value;
    if (!icIsimChannelId || message.channel.id !== icIsimChannelId) return false;
    if (message.author.bot) return false;

    const basvuruIsim = message.content;
    const basvuranUye = message.member;
    
    await message.delete();

    const embed = new EmbedBuilder()
        .setColor('#3498DB').setTitle('Yeni IC İsim Başvurusu')
        .setDescription(`**${basvuranUye.user.tag}** adlı kullanıcı yeni bir isim başvurusunda bulundu.`)
        .addFields(
            { name: 'Başvuran', value: basvuranUye.toString(), inline: true },
            { name: 'Talep Edilen İsim', value: `**${basvuruIsim}**`, inline: true }
        )
        .setFooter({ text: `Kullanıcı ID: ${basvuranUye.id}` }).setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`ic_isim-onayla-${basvuranUye.id}-${basvuruIsim}`).setLabel('Onayla').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ic_isim-reddet-${basvuranUye.id}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
        );

    await message.channel.send({ embeds: [embed], components: [row] });
    return true;
}

// Ana olay dinleyicisi
module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        
        try {
            // IC İsim başvurusu her zaman çalışmalı (yöneticiler de isim başvurusu yapabilir)
            const basvuruYapildi = await handleIcIsim(message, client);
            if (basvuruYapildi) return;

            // Filtreler için yönetici kontrolü
            if (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

            const reklamYapildi = await handleReklam(message, client);
            if (reklamYapildi) return;

            await handleKufur(message, client);
        } catch (error) {
            console.error("Mesaj denetimi sırasında hata:", error);
        }
    },
};
