// events/ready.js
const { ActivityType, Collection } = require('discord.js');

// Davetleri saklamak için bir Collection oluşturuyoruz
const invites = new Collection();

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`${client.user.tag} olarak giriş yapıldı ve bot hazır!`);
        client.user.setActivity('Alka - V %70 Sosyal %30 GunRP', { type: ActivityType.Playing });

        // Bot hazır olduğunda tüm sunuculardaki davetleri çek ve önbelleğe al
        try {
            const guilds = await client.guilds.fetch();
            for (const guild of guilds.values()) {
                const fetchedGuild = await guild.fetch();
                const fetchedInvites = await fetchedGuild.invites.fetch();
                invites.set(fetchedGuild.id, new Map(fetchedInvites.map((invite) => [invite.code, invite.uses])));
            }
            console.log('Tüm sunuculardaki davetler başarıyla önbelleğe alındı.');
        } catch (err) {
            console.error('Davetler önbelleğe alınırken bir hata oluştu:', err);
        }
        
        // Davetleri global olarak erişilebilir yap
        client.invites = invites;
    },
};
