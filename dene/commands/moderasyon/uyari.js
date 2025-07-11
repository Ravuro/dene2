// commands/moderasyon/uyari.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Punishment, Settings } = require('../../database');
const { Op } = require('sequelize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uyarı')
        .setDescription('Gelişmiş kullanıcı uyarı sistemi.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand.setName('ver')
                .setDescription('Bir kullanıcıya uyarı verir.')
                .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarılacak kullanıcı').setRequired(true))
                .addStringOption(option => option.setName('sebep').setDescription('Uyarı sebebi').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('liste')
                .setDescription('Bir kullanıcının uyarılarını listeler.')
                .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarıları listelenecek kullanıcı').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('sil')
                // YENİ: Açıklama ve opsiyon güncellendi.
                .setDescription('Bir kullanıcının en eski uyarılarından belirtilen adette siler.')
                .addUserOption(option => option.setName('kullanıcı').setDescription('Uyarısı silinecek kullanıcı').setRequired(true))
                .addIntegerOption(option => option.setName('adet').setDescription('Silinecek uyarı sayısı (en eskiden başlar).').setRequired(true).setMinValue(1))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('log-kanal')
                .setDescription('Uyarı loglarının gönderileceği kanalı ayarlar.')
                .addChannelOption(option => option.setName('kanal').setDescription('Log kanalı').setRequired(true))
        ),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const website = (await Settings.findOne({ where: { key: 'sunucu-website' } }))?.value;

        if (subcommand === 'ver') {
            const targetUser = interaction.options.getUser('kullanıcı');
            const reason = interaction.options.getString('sebep');

            const warning = await Punishment.create({
                userId: targetUser.id,
                moderatorId: interaction.user.id,
                type: 'uyari',
                reason: reason,
                isActive: true
            });

            const totalWarnings = await Punishment.count({ where: { userId: targetUser.id, type: 'uyari' } });

            await interaction.editReply(`**${targetUser.tag}** başarıyla uyarıldı. Bu kullanıcının toplam ${totalWarnings} uyarısı oldu.`);
            
            const logChannelId = (await Settings.findOne({ where: { key: 'uyariLogChannel' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#E67E22')
                        .setAuthor({ name: `${interaction.guild.name} | Uyarı Log`, iconURL: interaction.guild.iconURL() })
                        .setThumbnail(targetUser.displayAvatarURL())
                        .setDescription(`**${interaction.user}** tarafından **${targetUser}** adlı oyuncuya uyarı verildi.`)
                        .addFields(
                            { name: 'Sebep', value: reason, inline: false },
                            { name: 'Toplam Uyarı', value: `\`${totalWarnings}\``, inline: true },
                            { name: 'Uyarı ID', value: `\`${warning.id}\``, inline: true }
                        )
                        .setTimestamp();
                    if (website) logEmbed.setFooter({ text: `${website} | Uyarı Sistemi` });
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } 
        else if (subcommand === 'liste') {
            const targetUser = interaction.options.getUser('kullanıcı');
            const warnings = await Punishment.findAll({ where: { userId: targetUser.id, type: 'uyari' }, order: [['createdAt', 'ASC']] });

            if (warnings.length === 0) {
                return interaction.editReply({ content: `${targetUser.tag} adlı kullanıcının hiç uyarısı yok.` });
            }

            const description = warnings.map((w, index) => {
                const timestamp = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:f>`;
                return `**${index + 1}. Uyarı (ID: ${w.id})** - ${timestamp}\n**Sebep:** ${w.reason}\n**Yetkili:** <@${w.moderatorId}>`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setAuthor({ name: `${targetUser.tag} Uyarı Listesi`, iconURL: targetUser.displayAvatarURL() })
                .setDescription(description)
                .setFooter({ text: `Toplam ${warnings.length} uyarı.` });
            
            await interaction.editReply({ embeds: [embed] });
        } 
        else if (subcommand === 'sil') {
            const targetUser = interaction.options.getUser('kullanıcı');
            const amountToDelete = interaction.options.getInteger('adet');

            // YENİ: En eski uyarıları bulma mantığı
            const warningsToDelete = await Punishment.findAll({ 
                where: { userId: targetUser.id, type: 'uyari' },
                order: [['createdAt', 'ASC']], // En eskiden yeniye sırala
                limit: amountToDelete
            });

            if (warningsToDelete.length === 0) {
                return interaction.editReply(`**${targetUser.tag}** adlı kullanıcının silinecek bir uyarısı bulunamadı.`);
            }

            const deletedIds = warningsToDelete.map(w => w.id);
            await Punishment.destroy({ where: { id: { [Op.in]: deletedIds } } });
            
            const totalWarnings = await Punishment.count({ where: { userId: targetUser.id, type: 'uyari' } });

            await interaction.editReply(`**${targetUser.tag}** adlı kullanıcının en eski **${warningsToDelete.length}** adet uyarısı başarıyla silindi.`);

            const logChannelId = (await Settings.findOne({ where: { key: 'uyariLogChannel' } }))?.value;
            if (logChannelId) {
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                     const logEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setAuthor({ name: `${interaction.guild.name} | Uyarı Log`, iconURL: interaction.guild.iconURL() })
                        .setThumbnail(targetUser.displayAvatarURL())
                        .setDescription(`**${interaction.user}** tarafından **${targetUser}** adlı oyuncunun **${warningsToDelete.length}** uyarısı silindi.`)
                        .addFields(
                            { name: 'Kalan Uyarı Sayısı', value: `\`${totalWarnings}\``, inline: false }
                        )
                        .setTimestamp();
                    if (website) logEmbed.setFooter({ text: `${website} | Uyarı Sistemi` });
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } 
        else if (subcommand === 'log-kanal') {
            const channel = interaction.options.getChannel('kanal');
            await Settings.upsert({ key: 'uyariLogChannel', value: channel.id });
            await interaction.editReply(`Uyarı log kanalı başarıyla <#${channel.id}> olarak ayarlandı.`);
        }
    },
};
