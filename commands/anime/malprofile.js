const { MessageEmbed } = require('discord.js')
const { default : { prefix } } = require('../../settings.json')
const fetch = require('node-fetch')
const { textTrunctuate } = require('../../helper.js')
const profile = require('../../models/MAL_profile.js')
const moment = require('moment')
const malBadges = [
  { url: 'https://i.imgur.com/YGLefI9.png', max: 499, min: -1, title: 'unranked'},
  { url: 'https://i.imgur.com/DKHajgw.png', max: 999, min: 500, title: '500'},
  { url: 'https://i.imgur.com/dZ8bNQW.png', max: 4999, min: 1000, title: '1000'},
  { url: 'https://i.imgur.com/rabLZqh.png', max: 9999, min: 5000, title: '5000'},
  { url: 'https://i.imgur.com/01NgPDw.png', max: 14999, min: 10000, title: 'malkouhai'},
  { url: 'https://i.imgur.com/phrKQJI.png', max: 19999, min: 15000, title: 'malsenpai'},
  { url: 'https://i.imgur.com/MzmmlUG.png', max: 9999999, min: 20000, title: 'malsensei'},
]

module.exports = {
  config: {
    name: "malprofile",
    aliases: ['mal','malstat','malof','mal-of'],
    guildOnly: true,
    ownerOnly: false,
    adminOnly: false,
    permissions: null,
    clientPermissions: null,
    cooldown: {
      time: 10,
      msg: 'Oops! You are going to fast! Please slow down to avoid being rate-limited!'
    },
    group: 'anime',
  	description: 'Get user stats from [MAL](https://myanimelist.net "MyAnimeList Homepage")',
  	examples: ['malprofile 545427431662682112','malprofile @user','malprofile set Username','malprofile set NewUser -update'],
  	parameters: ['userID']
  },
  run: async ( client, message, [ usermention, ...info ] ) => {

  if (!usermention || (!usermention.startsWith('<@') && isNaN(Number(usermention)) && usermention.toLowerCase() !== 'self' && usermention.toLowerCase() !== 'set')) return message.channel.send(error('Please mention the user or provide his discord ID. Type `self` instead to view own profile.'))

  if (usermention.startsWith('<@') || !isNaN(Number(usermention)) && usermention.toLowerCase() !== 'self' && usermention.toLowerCase() !== 'set') usermention = usermention.match(/\d{18}/)[0];

  if (usermention.toLowerCase() === 'self') usermention = message.author.id

  if (usermention.toLowerCase() === 'set') {

    let database = await profile.findOne({ userID: message.author.id })


    if (database && (!info[1] || (info[1] !== '-update' && info[1] !== '-u'))) return message.channel.send(error(`**${message.member.displayName}**, your account is already linked to MAL. If you wish to replace it, add a \`-update\` tag at the end of your command.`))

    const data = await fetch(`https://api.jikan.moe/v3/user/${encodeURI(info[0])}/profile`).then(res => res.json())

    if (data.status) return message.channel.send(error(`User ${info[0]} doesn't exist on MAL!`))

    if (info[1] === '-update' || info[1] === '-u') {

      database.MALUser === data.username
      database.MALId === data.user_id

      await database.save()
      return message.channel.send(success(`**${message.member.displayName}**, your MAL list was successfully updated!`))

    } else {

      database = await new profile({ userID: message.author.id, MALUser: data.username, MALId: data.user_id }).save()

      if (!database) return message.channel.send(error('DATABASE ERROR: Could not save new profile on database.'))

      return message.channel.send(success(`**${message.member.displayName}**, your MAL list was successfully linked to **${data.username}**!`))

    }

  } else {

    const valid = message.guild.members.cache.get(usermention)

    if (!valid) return message.channel.send(error(`The provided user ID can't be found anywhere on this server`))

    const database = await profile.findOne({userID: usermention}).catch()

    if (!database) return message.channel.send(error(valid.id === message.author.id ?  `**${valid.displayName}**, seems like you haven't linked your profile yet. Link your profile by typing \`${prefix}malprofile set [mal username]\`` : ` **${valid.displayName}** haven't linked their profile yet.`))

    const data = await fetch(`https://api.jikan.moe/v3/user/${database.MALUser}/profile`).then(res => res.json())

    if (data.status) return message.channel.send(error(valid.id === message.author.id ? `**${valid.displayName}**, could not find the user you linked your account to. If you renamed your MAL profile, please update it here using \`${prefix}malprofile set [new mal username] -update\`.` : `**${valid.displayName}**'s MAL account could not be found.`))

    const { anime_stats, manga_stats } = data
    const { anime, manga, characters, people } = data.favorites
    const total = anime_stats.episodes_watched + manga_stats.volumes_read
    const badge = malBadges.find( b => total > b.min && total < b.max).url
    const favanime = hyperlinkify(anime)
    const favmanga = hyperlinkify(manga)
    const favchar = hyperlinkify(characters)
    const favpeople = hyperlinkify(people)

    return message.channel.send(new MessageEmbed()
      .setAuthor(`${data.username}'s profile.`,data.image_url, data.url )
      .setThumbnail(badge)
      .setDescription(`${data.about ? textTrunctuate(data.about,350,`...[Read More](${data.url})\n\n`) : ``}• **Gender:** ${data.gender}\n• **From:** ${data.location}\n• **Joined MAL:** ${moment(data.joined).format('LL')}, (*${moment.duration(new Date() - new Date(data.joined)).format(`Y [year] M [month] D [days]`) } ago.*)\n• **Last Seen:** ${moment(data.last_online).format('LL')}, (*${moment.duration(new Date() - new Date(data.last_online)).format(`Y [year] M [month] D [days] H [hours] m [minutes]`)} ago.*)`)
      .addField('Anime Stats',`\u200B\u2000\u2000• **Days watched**: ${anime_stats.days_watched}\n\u2000\u2000• **Mean Score**: ${anime_stats.mean_score}\n\u2000\u2000• **Watching**: ${anime_stats.watching}\n\u2000\u2000• **Completed**: ${anime_stats.completed}\n\u2000\u2000• **On Hold**: ${anime_stats.on_hold}\n\u2000\u2000• **Dropped**: ${anime_stats.dropped}\n\u2000\u2000• **Plan to Watch**: ${anime_stats.plan_to_watch}\n\u2000\u2000• **Rewatched**: ${anime_stats.rewatched}\n\u2000\u2000• **Total Entries:** ${anime_stats.total_entries}\n\u2000\u2000• **Episodes Watched**: ${anime_stats.episodes_watched}`,true)
      .addField('Manga Stats',`\u200B\u2000\u2000• **Days read**: ${manga_stats.days_read}\n\u2000\u2000• **Mean Score**: ${manga_stats.mean_score}\n\u2000\u2000• **Reading**: ${manga_stats.reading}\n\u2000\u2000• **Completed**: ${manga_stats.completed}\n\u2000\u2000• **On Hold**: ${manga_stats.on_hold}\n\u2000\u2000• **Dropped**: ${manga_stats.dropped}\n\u2000\u2000• **Plan to Read**: ${manga_stats.plan_to_read}\n\u2000\u2000• **Reread**: ${manga_stats.reread}\n\u2000\u2000• **Total Entries:** ${manga_stats.total_entries}\n\u2000\u2000• **Volumes read**: ${manga_stats.volumes_read}`,true)
      .addField(`Favorite Anime`, favanime ? favanime : 'Not Listed')
      .addField(`Favorite Manga`, favmanga ? favmanga : 'Not Listed')
      .addField(`Favorite Character`, favchar ? favchar : 'Not Listed')
      .addField(`Favorite People`, favpeople ? favpeople : 'Not Listed')
      .setTimestamp()
      .setColor('GREY')
      .setFooter(`MyAnimeList.net`,`https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png`)
      )
    }
  }
}

function error(err){
  return new MessageEmbed()
  .setColor('RED')
  .setDescription(`\u200B\n${err}\n\u200B`)
}

function success(str){
  return new MessageEmbed()
  .setColor('GREY')
  .setDescription(`\u200B\n${str}\n\u200B`)
}

function hyperlinkify(arr){
  if (!arr.length) return null

  let res = ''
  let lastindex = null

  for (let i = 0; res.length < 950 && lastindex === null; i++) {
    let toAdd = ` • [${arr[i].name}](${arr[i].url})`

    if (toAdd.length + res.length > 950) {
      lastindex = i
      return
    }

    return res += toAdd
  }

  return `${res}${lastindex && lastindex < arr.length - 1 ? ` and ${arr.length - lastindex - 1} more!`:`.`}`
}
