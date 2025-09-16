const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  SlashCommandBuilder, 
  Collection 
} = require("discord.js");

const fs = require("fs");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const activeOrders = new Map();

// ===== Items (agar config.json se lena hai to ye hata dena) =====
const items = [
  { name: "Logo Design", price: 5 },
  { name: "Server Banner", price: 5 },
  { name: "Animated Banner", price: 15 },
  { name: "Basic Server Setup", price: 5 },
  { name: "Advanced Server Setup", price: 15 },
  { name: "Reaction Roles", price: 5 },
  { name: "Ticket System", price: 5 },
  { name: "Basic Bots Setup", price: 5 },
  { name: "Custom Bot Development", price: 10 },
  { name: "Order System Setup", price: 10 },
  { name: "Auto Moderation System", price: 5 },
  { name: "Auto Announcements", price: 5 },
  { name: "Multi-language Setup", price: 10 },
  { name: "Security/Anti-Spam Setup", price: 5 }
];

// ===== Ready =====
client.once("ready", async () => {
  console.log(`${client.user.tag} is online ✅`);

  const data = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start the order process (Staff only).")
  ].map(cmd => cmd.toJSON());

  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set(data);
    console.log("Slash commands registered ✅");
  }
});

// ===== Interaction Handler =====
client.on("interactionCreate", async (interaction) => {
  // --- /order command ---
  if (interaction.isChatInputCommand() && interaction.commandName === "order") {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Ticket category check
      if (interaction.channel.parentId !== config.TICKET_CATEGORY) {
        return await interaction.editReply({
          content: "❌ Ye command sirf ticket channel me hi use ho sakti hai."
        });
      }

      // Start order
      activeOrders.set(interaction.channel.id, { step: 0, cart: [] });
      await showItem(interaction, 0, true);

    } catch (err) {
      console.error("Order command error:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "⚠️ Kuch galat ho gaya, try again." });
      } else {
        await interaction.reply({ content: "⚠️ Kuch galat ho gaya, try again.", ephemeral: true });
      }
    }
  }

  // --- Buttons ---
client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
        const order = activeOrders.get(interaction.channel.id);
        if (!order) return;

        if (interaction.customId.startsWith("add_")) {
            const step = parseInt(interaction.customId.split("_")[1]);
            const allServices = config.items.flatMap(g => g.services);
            const item = allServices[step];
            if (item) order.cart.push(item);

            order.step++;
            await showItem(interaction, order.step, false);
        }

        else if (interaction.customId.startsWith("skip_")) {
            order.step++;
            await showItem(interaction, order.step, false);
        }

        else if (interaction.customId === "confirm") {
            const logChannel = interaction.guild.channels.cache.get(config.ORDER_LOGS_CHANNEL);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle("📦 New Order Confirmed")
                    .setDescription(order.cart.map(i => `• ${i.name} - ${i.price}${config.currency[0]} (${i.inr}₹)`).join("\n"))
                    .addFields({ name: "Customer", value: `<@${interaction.user.id}>` })
                    .addFields({ name: "Total", value: `${order.cart.reduce((a, b) => a + b.price, 0)}${config.currency[0]} (${order.cart.reduce((a, b) => a + b.price, 0) * 85}₹)` })
                    .setColor("Green");

                await logChannel.send({ embeds: [embed] });
            }

            await interaction.update({ content: "✅ Order confirm ho gaya!", embeds: [], components: [] });
            activeOrders.delete(interaction.channel.id);
        }
    }
});

// ===== Show Item Function =====
async function showItem(interaction, step, fresh = false) {
    const allServices = config.items.flatMap(g => g.services); // saare items ek hi array me
    const service = allServices[step];

    if (!service) {
        // Agar items khatam ho gaye → summary dikhao
        return await showSummary(interaction, activeOrders.get(interaction.channel.id).cart);
    }

    const embed = new EmbedBuilder()
        .setTitle(`🛠️ ${service.name}`)
        .setDescription(`Price: ${service.price}${config.currency[0]} (${service.inr}₹)`)
        .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`add_${step}`).setLabel("Add to Cart").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`skip_${step}`).setLabel("Skip").setStyle(ButtonStyle.Secondary)
    );

    if (fresh) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.update({ embeds: [embed], components: [row] });
    }
}

// ===== Function to show final summary =====
async function showSummary(interaction, cart) {
    if (!cart.length) {
        return await interaction.update({
            content: "🛒 Tumhari cart empty hai, koi order confirm nahi hua.",
            embeds: [],
            components: []
        });
    }

    const embed = new EmbedBuilder()
        .setTitle("🛍️ Order Summary")
        .setDescription(cart.map((c, i) => `${i + 1}. ${c.name} - ${c.price}${config.currency[0]} (${c.inr}₹)`).join("\n"))
        .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirm").setLabel("Confirm Order").setStyle(ButtonStyle.Success)
    );

    await interaction.update({ embeds: [embed], components: [row] });
}
  
// ===== Login =====
client.login(process.env.TOKEN);
// ================== Dummy Web Server for Render ==================
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Bot is running fine on Render!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Web server running on port ${process.env.PORT || 3000}`);
});
