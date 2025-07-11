// commands/araclar/hex.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
require('dotenv').config(); // .env dosyasını okumak için

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hex')
        .setDescription('Verilen Steam kimliğinden (URL, ID64, özel URL) HEX kodunu bulur.')
        .addStringOption(option => option.setName('steam-kimligi').setDescription('SteamID64, profil veya özel URL\'si').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const kimlik = interaction.options.getString('steam-kimligi');
        const apiKey = process.env.STEAM_API_KEY;

        if (!apiKey) {
            return interaction.editReply({
                content: 'Bu komutun çalışması için bir Steam Web API anahtarı gerekiyor. Lütfen `.env` dosyasına `STEAM_API_KEY` değişkenini ekleyin.',
                flags: MessageFlags.Ephemeral
            });
        }

        let steamID64 = '';

        // Girdinin zaten bir SteamID64 olup olmadığını kontrol et
        if (/^\d{17}$/.test(kimlik)) {
            steamID64 = kimlik;
        } else {
            // URL'den özel ismi veya ID'yi ayıkla
            const urlMatch = kimlik.match(/steamcommunity\.com\/(?:id|profiles)\/([^/]+)/);
            if (!urlMatch || !urlMatch[1]) {
                return interaction.editReply({ content: 'Geçersiz bir Steam profili URL\'si girdiniz.', flags: MessageFlags.Ephemeral });
            }
            
            const vanityOrId = urlMatch[1];
            
            // Eğer ayıklanan kısım zaten bir ID ise, onu kullan
            if (/^\d{17}$/.test(vanityOrId)) {
                steamID64 = vanityOrId;
            } else {
                // Değilse, bu bir özel URL'dir, Steam API ile çöz
                try {
                    const apiUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityOrId}`;
                    const response = await fetch(apiUrl);
                    const data = await response.json();

                    if (data.response && data.response.success === 1 && data.response.steamid) {
                        steamID64 = data.response.steamid;
                    } else {
                        return interaction.editReply({ content: `\`${vanityOrId}\` adlı özel URL çözümlenemedi veya bulunamadı.`, flags: MessageFlags.Ephemeral });
                    }
                } catch (apiError) {
                    console.error("Steam API error:", apiError);
                    return interaction.editReply({ content: 'Steam API\'sine bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', flags: MessageFlags.Ephemeral });
                }
            }
        }

        // SteamID64'ü HEX'e çevir
        try {
            const steamHex = 'steam:' + BigInt(steamID64).toString(16);
            const embed = new EmbedBuilder()
                .setTitle('Steam HEX Kodu Bulundu')
                .setColor('#1b2838')
                .addFields(
                    { name: 'SteamID64', value: `\`${steamID64}\``, inline: false },
                    { name: 'FiveM HEX Kodu', value: `\`${steamHex}\``, inline: false }
                )
                .setFooter({ text: 'Steam Community', iconURL: 'https://store.cloudflare.steamstatic.com/public/shared/images/responsive/share_steam_logo.png' });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ content: 'HEX kodu oluşturulurken bir hata oluştu. Lütfen girdiğiniz kimliğin doğru olduğundan emin olun.', flags: MessageFlags.Ephemeral });
        }
    },
};
