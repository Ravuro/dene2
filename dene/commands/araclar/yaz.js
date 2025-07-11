// commands/araclar/yaz.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yaz')
        .setDescription('Botun belirlediğiniz kanala mesaj yazmasını sağlar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addStringOption(option => option.setName('mesaj').setDescription('Gönderilecek düz metin mesajı.').setRequired(true))
        .addChannelOption(option => option.setName('kanal').setDescription('Mesajın gönderileceği kanal (belirtilmezse bu kanala gönderir).').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption(option => option.setName('embed-baslik').setDescription('Embed mesajı için başlık.').setRequired(false)),
    async execute(interaction) {
        const messageContent = interaction.options.getString('mesaj');
        const channel = interaction.options.getChannel('kanal') || interaction.channel;
        const embedTitle = interaction.options.getString('embed-baslik');

        const targetChannel = await interaction.guild.channels.fetch(channel.id);
        if (!targetChannel) {
            return interaction.reply({ content: 'Belirtilen kanal bulunamadı.', flags: MessageFlags.Ephemeral });
        }

        if (embedTitle) {
            const embed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setDescription(messageContent)
                .setColor('#3498DB');
            await targetChannel.send({ embeds: [embed] });
        } else {
            await targetChannel.send(messageContent);
        }

        await interaction.reply({ content: `Mesajınız <#${targetChannel.id}> kanalına başarıyla gönderildi.`, flags: MessageFlags.Ephemeral });
    },
};
