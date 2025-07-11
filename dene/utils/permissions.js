// utils/permissions.js
const { Settings } = require('../database');
const { MessageFlags } = require('discord.js');

/**
 * Bir kullanıcının belirli bir işlemi yapmak için gerekli rollerden birine sahip olup olmadığını kontrol eder.
 * @param {import('discord.js').CommandInteraction} interaction Etkileşim nesnesi.
 * @param {string} permissionKey Veritabanında aranacak yetki anahtarı (örn: 'ban-yetki').
 * @returns {Promise<boolean>} Kullanıcının yetkisi varsa true, yoksa false döner.
 */
async function checkPermission(interaction, permissionKey) {
    // Sunucu sahibi her zaman tüm komutları kullanabilir.
    if (interaction.user.id === interaction.guild.ownerId) {
        return true;
    }

    const setting = await Settings.findOne({ where: { key: permissionKey } });
    // Veritabanından gelen değerin bir dizi olduğundan emin oluyoruz.
    const requiredRoleIds = setting?.value || [];

    // Gerekli rol(ler) ayarlanmamışsa veya liste boşsa, kimse kullanamaz.
    if (!Array.isArray(requiredRoleIds) || requiredRoleIds.length === 0) {
        // deferReply zaten yapıldıysa followUp kullan, yapılmadıysa reply kullan.
        const replyFunction = interaction.deferred || interaction.replied ? 'followUp' : 'reply';
        await interaction[replyFunction]({
            content: `Bu komutu kullanmak için gerekli olan \`${permissionKey}\` rol(leri) henüz ayarlanmamış. Lütfen bir yöneticiyle iletişime geçin.`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    // Kullanıcının listedeki rollerden herhangi birine sahip olup olmadığını kontrol et.
    const hasPermission = interaction.member.roles.cache.some(role => requiredRoleIds.includes(role.id));

    if (!hasPermission) {
        const roleMentions = requiredRoleIds.map(id => `<@&${id}>`).join(' veya ');
        const replyFunction = interaction.deferred || interaction.replied ? 'followUp' : 'reply';
        await interaction[replyFunction]({
            content: `Bu komutu kullanmak için ${roleMentions} rollerinden birine sahip olmalısınız.`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    // Tüm kontrollerden geçtiyse, yetkisi vardır.
    return true;
}

module.exports = { checkPermission };
