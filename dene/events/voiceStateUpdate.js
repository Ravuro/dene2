// events/voiceStateUpdate.js
// BU YENİ BİR DOSYADIR. "events" klasörünün içine ekleyin.
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { Settings } = require('../database');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const logChannelId = (await Settings.findOne({ where: { key: 'sesLog' } }))?.value;
        if (!logChannelId) return;

        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) return;

        const member = newState.member || oldState.member;
        const user = member.user;

        let embed;

        // Kanala Girme
        if (!oldState.channel && newState.channel) {
            embed = new EmbedBuilder()
                .setColor('#2ECC71') // Yeşil
                .setTitle('Ses Kanalına Giriş Yapıldı')
                .setDescription(`${member} adlı kullanıcı **${newState.channel.name}** adlı ses kanalına katıldı.`)
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTimestamp();
        }
        // Kanaldan Çıkma
        else if (oldState.channel && !newState.channel) {
            embed = new EmbedBuilder()
                .setColor('#E74C3C') // Kırmızı
                .setTitle('Ses Kanalından Çıkış Yapıldı')
                .setDescription(`${member} adlı kullanıcı **${oldState.channel.name}** adlı ses kanalından ayrıldı.`)
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTimestamp();
        }
        // Kanal Değiştirme
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            embed = new EmbedBuilder()
                .setColor('#3498DB') // Mavi
                .setTitle('Ses Kanalı Değiştirildi')
                .setDescription(`${member} adlı kullanıcı kanal değiştirdi.`)
                .addFields(
                    { name: 'Eski Kanal', value: oldState.channel.name, inline: true },
                    { name: 'Yeni Kanal', value: newState.channel.name, inline: true }
                )
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTimestamp();
        }
        // Diğer durumlar (mute, deafen vb.) - Opsiyonel
        else if (oldState.serverMute !== newState.serverMute) {
             embed = new EmbedBuilder()
                .setColor('#F1C40F') // Sarı
                .setTitle('Susturma Durumu Değişti')
                .setDescription(`${member} adlı kullanıcının sunucu susturması **${newState.serverMute ? 'AÇILDI' : 'KAPATILDI'}**.`)
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTimestamp();
        }

        // Eğer bir embed oluşturulduysa, log kanalına gönder
        if (embed) {
            try {
                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error("Ses logu gönderilirken hata oluştu:", error);
            }
        }
    },
};
