import "dotenv/config";
import cron from "node-cron";
import { Client, GatewayIntentBits, GuildMember } from "discord.js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const token = requiredEnv("DISCORD_TOKEN");
const scareChannelId = requiredEnv("SCARE_CHANNEL_ID");
const rolelist = [
  "491782859691130880",
  "491782873725141000",
  "491782890984570891",
  "491782906814136331",
  "491782922903486475",
  "491782943061311498",
  "491782956369575966",
  "491782972761047040",
  "491782992889380864"
];
const scareChance = 1 / 100;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

async function maybeScare() {
  if (Math.random() >= scareChance) {
    return;
  }

  try {
    const channel = await client.channels.fetch(scareChannelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      console.error(
        `Scare channel ${scareChannelId} was not found or is not a guild text channel.`,
      );
      return;
    }

    const guild = channel.guild;
    await guild.members.fetch();
    const eligibleMembers: GuildMember[] = [];

    for (const roleId of rolelist) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.error(
          `Role ${roleId} was not found in guild ${guild.id}.`,
        );
        continue;
      }

      for (const member of role.members.values()) {
        if (!member.user.bot) {
          eligibleMembers.push(member);
        }
      }
    }

    if (eligibleMembers.length === 0) {
      console.warn(
        `No eligible human members found in configured roles in guild ${guild.id}.`,
      );
      return;
    }

    const selectedIndex = Math.floor(Math.random() * eligibleMembers.length);
    const selectedMember = eligibleMembers[selectedIndex];

    await channel.send({
      content: `Boo! <@${selectedMember.id}>`,
      allowedMentions: { users: [selectedMember.id] },
    });
  } catch (error) {
    console.error(
      "Failed to select or ping a member:",
      error,
    );
  }
}

client.once("ready", (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
  cron.schedule("* * * * *", () => {
    void maybeScare();
  });
});

void client.login(token);
