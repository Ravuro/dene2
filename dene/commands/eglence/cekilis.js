// commands/eglence/cekilis.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { Giveaways } = require('../../database');
const ms = require('ms');

async function endGiveaway(client, giveaway) {
    if (giveaway.ended) return;

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return;

    const reaction = message.reactions.cache.get('🎉');
    const users = await reaction.users.fetch();
    const participants = users.filter(user => !user.bot);

    let winners = [];
    if (participants.size > 0) {
        const winnerUsers = participants.random(giveaway.winnerCount);
        winners = winnerUsers.map(u => u.id);
    }
    
    await giveaway.update({ ended: true, winners: winners });

    const embed = new EmbedBuilder()
        .setTitle(`🎉 Çekiliş Bitti: ${giveaway.prize} 🎉`)
        .setColor(winners.length > 0 ? '#2ECC71' : '#E74C3C')
        .setDescription(
            winners.length > 0
                ? `Tebrikler ${winners.map(w => `<@${w}>`).join(', ')}! **${giveaway.prize}** ödülünü kazandınız!`
                : 'Yeterli katılım olmadığı için kazanan seçilemedi.'
        );
    
    await message.edit({ embeds: [embed], components: [] });

    if (winners.length > 0) {
        await channel.send(`Tebrikler ${winners.map(w => `<@${w}>`).join(', ')}! **${giveaway.prize}** çekilişini kazandınız!`);
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('çekiliş')
        .setDescription('Veritabanına kayıtlı gelişmiş çekiliş sistemi.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand.setName('başlat')
                .setDescription('Yeni bir çekiliş başlatır.')
                .addStringOption(option => option.setName('süre').setDescription('Çekiliş süresi (örn: 10m, 1h, 2d)').setRequired(true))
                .addIntegerOption(option => option.setName('kazanan-sayisi').setDescription('Kazanacak kişi sayısı').setRequired(true).setMinValue(1))
                .addStringOption(option => option.setName('ödül').setDescription('Çekiliş ödülü').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('bitir')
                .setDescription('Bir çekilişi anında bitirir.')
                .addStringOption(option => option.setName('mesaj-id').setDescription('Çekiliş mesajının ID\'si').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('yeniden-çek')
                .setDescription('Bitmiş bir çekiliş için yeni kazanan seçer.')
                .addStringOption(option => option.setName('mesaj-id').setDescription('Çekiliş mesajının ID\'si').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === 'başlat') {
            const durationStr = interaction.options.getString('süre');
            const winnerCount = interaction.options.getInteger('kazanan-sayisi');
            const prize = interaction.options.getString('ödül');
            const durationMs = ms(durationStr);

            if (!durationMs) return interaction.editReply('Geçersiz süre formatı! Örnek: `10m`, `1h`, `2d`');

            const endTime = new Date(Date.now() + durationMs);

            const embed = new EmbedBuilder()
                .setTitle(`🎉 Çekiliş: ${prize} 🎉`)
                .setColor('#3498DB')
                .setDescription(`Katılmak için 🎉 emojisine tıklayın!\nSüre: <t:${Math.floor(endTime.getTime() / 1000)}:R>\nKazanan Sayısı: **${winnerCount}**`)
                .setTimestamp(endTime).setFooter({ text: 'Bitiş Tarihi' });

            const sentMessage = await interaction.channel.send({ embeds: [embed] });
            await sentMessage.react('🎉');

            const newGiveaway = await Giveaways.create({
                messageId: sentMessage.id,
                channelId: sentMessage.channel.id,
                guildId: interaction.guild.id,
                prize: prize,
                winnerCount: winnerCount,
                endTime: endTime,
            });

            setTimeout(() => endGiveaway(interaction.client, newGiveaway), durationMs);

            await interaction.editReply('Çekiliş başarıyla başlatıldı!');
        } 
        else if (subcommand === 'bitir' || subcommand === 'yeniden-çek') {
            const messageId = interaction.options.getString('mesaj-id');
            const giveaway = await Giveaways.findOne({ where: { messageId: messageId, guildId: interaction.guild.id } });

            if (!giveaway) return interaction.editReply('Bu ID ile bir çekiliş bulunamadı.');

            if (subcommand === 'bitir' && giveaway.ended) return interaction.editReply('Bu çekiliş zaten bitmiş.');
            if (subcommand === 'yeniden-çek' && !giveaway.ended) return interaction.editReply('Bu çekilişin yeniden çekilebilmesi için önce bitmesi gerekir.');
            
            await endGiveaway(interaction.client, giveaway);
            await interaction.editReply(`Çekiliş başarıyla ${subcommand === 'bitir' ? 'bitirildi' : 'yeniden çekildi'}!`);
        }
    },
};
