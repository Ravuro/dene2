// commands/rol-oyunu/context-ic-isim-reddet.js
const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Settings } = require('../../database'); // Settings modelini import ediyoruz

module.exports = {
    // Bağlam Menüsü Komutu olarak tanımlıyoruz
    data: new ContextMenuCommandBuilder()
        .setName('iC İsim Reddet') // Discord'da görünecek isim
        .setType(ApplicationCommandType.Message) // Tipi Message olarak değiştirdik
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles), // Rolleri yönetme yetkisi olanlar görsün

    async execute(interaction, client) {
        const targetMessage = interaction.targetMessage; // Sağ tıklanan mesaj
        const targetUser = targetMessage.author; // Mesajın yazarı
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: 'Mesajın sahibi sunucuda bulunamadı.', ephemeral: true });
        }

        // Yetki kontrolü (mevcut IC isim sisteminizdekiyle aynı)
        // client.settings yerine doğrudan Settings modelini kullanıyoruz
        const kayitYetkiliRolId = (await Settings.findOne({ where: { key: 'kayit-yetkili-rol' } }))?.value;
        const requiredRoles = Array.isArray(kayitYetkiliRolId) ? kayitYetkiliRolId : [kayitYetkiliRolId];
        const hasPermission = interaction.member.roles.cache.some(role => requiredRoles.includes(role.id));

        if (!hasPermission) {
            return interaction.reply({ content: 'Bu işlemi yapmak için "Kayıt Yetkilisi" rolüne sahip olmalısınız.', ephemeral: true });
        }

        // Reddetme sebebi modalını göster
        // CustomId'ye targetUser.id ve mesaj içeriğini ekliyoruz (encoding gerekebilir)
        // Mesaj içeriğinde özel karakterler olabileceği için encode ediyoruz
        const encodedMessageContent = encodeURIComponent(targetMessage.content.trim());
        const modal = new ModalBuilder()
            .setCustomId(`context_ic_isim-reddet-modal-${targetUser.id}-${encodedMessageContent}`) 
            .setTitle('IC İsim Reddetme Sebebi');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reddet_sebep')
            .setLabel('Reddetme Sebebi')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    },
};
