// commands/rol-oyunu/context-ic-isim-onayla.js
const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { Settings } = require('../../database');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('iC İsim Onayla')
        .setType(ApplicationCommandType.Message) // Tipi Message olarak değiştirdik
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const targetMessage = interaction.targetMessage; // Sağ tıklanan mesaj
        const targetUser = targetMessage.author; // Mesajın yazarı
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: 'Mesajın sahibi sunucuda bulunamadı.' });
        }

        // Yetki kontrolü
        const kayitYetkiliRolId = (await Settings.findOne({ where: { key: 'kayit-yetkili-rol' } }))?.value;
        const requiredRoles = Array.isArray(kayitYetkiliRolId) ? kayitYetkiliRolId : [kayitYetkiliRolId];
        const hasPermission = interaction.member.roles.cache.some(role => requiredRoles.includes(role.id));

        if (!hasPermission) {
            return interaction.editReply({ content: 'Bu işlemi yapmak için "Kayıt Yetkilisi" rolüne sahip olmalısınız.' });
        }

        const onayRolId = (await Settings.findOne({ where: { key: 'icIsimRole' } }))?.value;
        if (onayRolId) {
            const rol = interaction.guild.roles.cache.get(onayRolId);
            if (rol) await targetMember.roles.add(rol).catch(console.error);
        }

        // Mesajın içeriğini IC isim olarak alıyoruz
        const newIcName = targetMessage.content.trim(); 
        if (!newIcName) {
            return interaction.editReply({ content: 'Mesaj içeriği boş olduğu için IC isim ayarlanamadı.' });
        }

        await targetMember.setNickname(newIcName, 'IC İsim bağlam menüsü ile onaylandı.').catch(console.error);

        await targetUser.send(`Tebrikler! **${interaction.guild.name}** sunucusundaki isminiz \`${newIcName}\` olarak onaylandı.`).catch(() => {});

        const icIsimLogChannelId = (await Settings.findOne({ where: { key: 'icIsimLog' } }))?.value;
        if (icIsimLogChannelId) {
            const logChannel = await client.channels.fetch(icIsimLogChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('IC İsim Bağlam Menüsü ile Onaylandı')
                    .addFields(
                        { name: 'Onaylanan Kullanıcı', value: targetUser.toString(), inline: true },
                        { name: 'Onaylayan Yetkili', value: interaction.user.toString(), inline: true },
                        { name: 'Ayarlanan İsim', value: `\`${newIcName}\``, inline: false }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await interaction.editReply({ content: `✅ **${targetUser.tag}** adlı kullanıcının IC ismi başarıyla onaylandı ve \`${newIcName}\` olarak ayarlandı.` });
    },
};
