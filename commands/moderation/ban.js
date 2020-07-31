const { MessageEmbed } = require('discord.js')
const { user : { owner } } = require('../../settings.json')

module.exports = {
  config: {
    name: "ban",
    aliases: [],
    guildOnly: true,
    ownerOnly: false,
    adminOnly: false,
    permissions: ['BAN_MEMBERS'],
    clientPermissions: ['BAN_MEMBERS'],
    cooldown: null,
    group: 'moderation',
  	description: 'ban mentioned user from this server.',
  	examples: ['ban @user'],
  	parameters: ['user mention']
  },
  run: async ( client, message, args) => {

  if (!message.mentions.members.size) {

    return message.channel.send(error(`Please mention user to ban.`))

  }

  if (message.mentions.members.size > 1) {

    return message.channel.send(error(`I wouldn't ban multiple users for security issues.`))

  }

  const member = message.mentions.members.first()

  if (member.id === message.author.id) {

    return message.channel.send(error('I wouldn\'t dare ban you!'))

  }

  if (member.id === client.id) {

    return message.channel.send(error('Please don\'t ban me!'))

  }

  if (member.user.bot) {

    return message.channel.send(error('I\'m friends with other bots. I wouldn\'t ban them!'))

  }

  if (member.id === message.guild.ownerID) {

    return message.channel.send(error('Sorry you cannot ban a server owner!'))

  }

  if (member.id === owner) {

    return message.channel.send(error('How dare you ban my developer!'))

  }

  if (message.guild.me.roles.highest.position < member.roles.highest.position) {

    return message.channel.send(error(`I can't ban ${member}! Their highest role position is higher than mine.`))

  }

  if (message.member.roles.highest.position < member.roles.highest.position) {

    return message.channel.send(error(`You can't ban ${member}! Their highest role position is higher than yours.`))

  }

  if (!member.bannable) {

    return message.channel.send(error(`I can't ban ${member} for some Unknown reason.`))

  }

  const reason = args.length ? args.join(' ').replace(`<@${member.id}>`,'') : 'None'

  const warnMessage = await message.channel.send(prompt(`Are you sure you want to ban **${member.displayName}**?`))
  const msg = await message.channel.awaitMessages( res => res.author.id === message.author.id, { max: 1, time: 30000})

  if (!msg.size || !['y','yes'].includes(msg.first().content.toLowerCase())) {

    if (!warnMessage.deleted) warnMessage.delete()
    message.channel.send(error(`Ban Command Terminated!`))

  }

  if (['n','no'].includes(msg.first().content.toLowerCase())) {

    if (!warnMessage.deleted) warnMessage.delete()
    warnMessage.edit(error(`Cancelled banning **${member.displayName}**`))

  }

  try {
    await member.send(new MessageEmbed().setAuthor('Ban Notice!').setDescription(`Oh no ${member}! You have been banned from **${message.guild.name}**!\n\n${message.author.tag} has banned you from our server${reason === 'None' ? '.' : ` because of the following reason:\n\`\`\`${reason}\n\`\`\``}`).setColor('RANDOM').setThumbnail(message.author.displayAvatarURL()).setFooter('This message is auto-generated.').setTimestamp())
  } catch (err) {
    await message.channel.send(error(`Failed to notify **${member.displayName}** for the ban! (DM Failed)`))
  }

   const done = await member.ban({ days: 7, reason: `MAI-BANS: ${message.author.tag}: ${reason}`}).catch(()=>{})

   if (done) return message.channel.send(success(`Successfully banned **${member.displayName}**`))

   return message.channel.send(error(`Failed to ban **${member.displayName}**`))
  }
}

function error(err){
  return new MessageEmbed()
  .setColor('RED')
  .setDescription(`\u200B\n${err}\n\u200B`)
}

function prompt(msg){
  return new MessageEmbed()
  .setColor('ORANGE')
  .setDescription(`\u200B\n${msg}\n\u200B`)
}

function success(msg){
  return new MessageEmbed()
  .setColor('GREEN')
  .setDescription(`\u200B\n${msg}\n\u200B`)
}
