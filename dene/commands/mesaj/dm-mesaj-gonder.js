// commands/mesaj/dm-mesaj-gonder.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-mesaj-gönder')
        .setDescription('Kullanıcılara veya rollere özel mesaj gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand.setName('kullanici')
                .setDescription('Belirli bir kullanıcıya DM gönderir.')
                .addUserOption(option => option.setName('hedef').setDescription('Mesaj gönderilecek kullanıcı').setRequired(true))
                .addStringOption(option => option.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('rol')
                .setDescription('Belirli bir roldeki tüm kullanıcılara DM gönderir.')
                .addRoleOption(option => option.setName('hedef').setDescription('Mesaj gönderilecek rol').setRequired(true))
                .addStringOption(option => option.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true))
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const messageContent = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Bir Mesajınız Var!')
            .setDescription(messageContent)
            .setFooter({ text: `${interaction.guild.name} sunucusundan gönderildi.` })
            .setTimestamp();

        await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

        if (subcommand === 'kullanici') {
            const user = interaction.options.getUser('hedef');
            
            try {
                await user.send({ embeds: [embed] });
                await interaction.editReply({ content: `${user.tag} adlı kullanıcıya mesaj başarıyla gönderildi.` });
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: `${user.tag} adlı kullanıcıya mesaj gönderilemedi. Muhtemelen DM'leri kapalı.` });
            }
        } 
        else if (subcommand === 'rol') {
            const role = interaction.options.getRole('hedef');

            const members = await interaction.guild.members.fetch();
            const membersWithRole = members.filter(member => member.roles.cache.has(role.id) && !member.user.bot);
            
            let successCount = 0;
            let failCount = 0;

            await interaction.editReply({ content: `**${role.name}** rolündeki **${membersWithRole.size}** üyeye mesaj gönderme işlemi başlatıldı...` });

            for (const member of membersWithRole.values()) {
                await member.send({ embeds: [embed] })
                    .then(() => successCount++)
                    .catch(() => failCount++);
                await new Promise(resolve => setTimeout(resolve, 250));
            }

            await interaction.followUp({ content: `İşlem tamamlandı.\n✅ Başarılı: **${successCount}**\n❌ Başarısız: **${failCount}**`, flags: InteractionResponseFlags.Ephemeral });
        }
    },
};
