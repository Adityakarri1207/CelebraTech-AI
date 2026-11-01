/**
 * GenAI Invitation & Toast Copy Studio Component for CelebraTech AI.
 * Generates tailored copy for Save-the-Dates, Formal Invites, WhatsApp RSVPs,
 * 3-Minute Toast Speeches, and Social Media Captions.
 */

const InvitationStudioComponent = {
  activeTab: "formal", // 'formal' | 'whatsapp' | 'toast' | 'social'

  render(event) {
    if (!event) return;
    this.renderTabs();
    this.renderContent(event);
  },

  renderTabs() {
    const tabs = ["formal", "whatsapp", "toast", "social"];
    tabs.forEach((t) => {
      const btn = document.getElementById(`invite-tab-${t}`);
      if (btn) {
        if (t === this.activeTab) {
          btn.className = "px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md transition-all";
        } else {
          btn.className = "px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all";
        }
      }
    });
  },

  setTab(tab, event) {
    this.activeTab = tab;
    this.renderTabs();
    this.renderContent(event || App.currentEvent);
  },

  renderContent(event) {
    const container = document.getElementById("invitation-studio-output");
    if (!container || !event) return;

    const copyData = this.generateCopy(event);
    const item = copyData[this.activeTab];

    container.innerHTML = `
      <div class="glass-panel p-6 sm:p-8 rounded-3xl space-y-5 animate-scaleUp">
        
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-purple-400 block">${item.badge}</span>
            <h3 class="text-base font-bold text-white mt-0.5">${item.title}</h3>
          </div>
          <button type="button" onclick="InvitationStudioComponent.copyToClipboard('${encodeURIComponent(item.text)}')" class="btn-glow-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
            <span>📋</span> Copy to Clipboard
          </button>
        </div>

        <div class="bg-black/40 p-5 rounded-2xl border border-white/10 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-all shadow-inner">
${item.text}
        </div>

        <div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2.5">
          <span class="text-base">💡</span>
          <div>
            <strong class="font-bold">Pro-Tip for Hosts:</strong>
            <p class="mt-0.5 text-purple-200/90">${item.tip}</p>
          </div>
        </div>

      </div>
    `;
  },

  generateCopy(event) {
    const title = event.title;
    const date = event.date || "Date to be announced";
    const location = event.location || "Venue to be announced";
    const type = event.event_type;

    if (type === "wedding") {
      return {
        formal: {
          badge: "Printed Stationery & Paper Invitations",
          title: "Formal Wedding Invitation Suite",
          tip: "Include a card insert with your wedding website URL and hotel booking deadline.",
          text: `Together with their families and loved ones,
We joyfully invite you to celebrate the marriage of

SOFIA & JULIAN

On Saturday, the Fourteenth of November
Two Thousand and Twenty-Six
At half past three in the afternoon

${location}

Dinner, cocktails, and dancing to follow.
Black-Tie Optional Attire

Kindly RSVP by the Tenth of October
at www.celebra-tech.com/sofia-and-julian`,
        },
        whatsapp: {
          badge: "Instant Digital & SMS Sharing",
          title: "WhatsApp & Text Message RSVP",
          tip: "Add a direct link to your digital RSVP form so guests can confirm in 10 seconds.",
          text: `✨ Save the Date! Sofia & Julian are getting married! 💍

We can't imagine our special day without you!
📅 Date: ${date}
📍 Location: ${location}

Check out all the details, travel accommodations, and RSVP right here:
👉 https://celebra-tech.com/rsvp?event=${event.id}

Please let us know your meal preferences and song requests by October 10th. Can't wait to celebrate together! 🥂🎉`,
        },
        toast: {
          badge: "Speech Blueprint",
          title: "3-Minute Best Man / Maid of Honor Toast",
          tip: "Practice reading aloud twice; 3 minutes feels conversational and keeps the crowd smiling.",
          text: `[Warm Opening - 30 seconds]
"Good evening, everyone! For those who don't know me, I am [Your Name], and I've had the immense honor of knowing [Name] for over [X] years. Seeing everyone gathered here tonight from all corners of the world is a true testament to the incredible warmth and joy this couple brings into our lives.

[The Signature Story - 90 seconds]
When [Name] first met [Partner], I remember getting that first phone call. [Name] couldn't stop talking about how they spent four hours just talking in a coffee shop about everything from dream adventures to favorite songs. In all the years I've known [Name], I have never seen them smile with quite the radiance and absolute certainty as they did that afternoon.

[The Transformation - 30 seconds]
[Partner], you complement [Name] in every imaginable way. You bring out their adventurous spirit, support their wildest dreams, and together, your laughter fills every room you walk into. You aren't just partners; you are an unstoppable team.

[The Toast - 30 seconds]
So everyone, please raise your glasses with me. To love that grows stronger with every passing season, to laughter through every adventure, and to a lifetime of unforgettable memories. To Sofia and Julian! Cheers!"`,
        },
        social: {
          badge: "Instagram & Social Media",
          title: "Social Media Captions & Hashtags",
          tip: "Create a memorable custom wedding hashtag and place it on small acrylic tent cards at the bar.",
          text: `Danced under the stars with our favorite people in the world. Forever wouldn't be long enough. ✨🥂💍

Venue: ${location}
Dress: Couture Atelier
Florals: Bloom & Petal Couture
Captured by: Lumière Studios

#SofiaAndJulian2026 #TuscanSunsetWedding #JustMarried #ForeverBegins #WeddingCelebration`,
        },
      };
    } else if (type === "birthday") {
      return {
        formal: {
          badge: "Formal Digital / Printed Card",
          title: "Milestone Birthday Celebration Invitation",
          tip: "State whether guests should bring gifts or if their presence is the present.",
          text: `LEVEL 30 UNLOCKED! 🎮✨

Join us as we raise a toast to
MARCUS'S 30TH BIRTHDAY BASH!

Saturday, December 5th, 2026
7:00 PM onwards

${location}

Expect signature neon cocktails, artisan street bites, 
and high-voltage dance floor beats.

Dress Code: Cocktail Glam with a Touch of Neon!
RSVP by November 20th`,
        },
        whatsapp: {
          badge: "Instant Group Chat Invitation",
          title: "WhatsApp & Telegram Party Broadcast",
          tip: "Send to group chats 3 weeks ahead, followed by a reminder 3 days before.",
          text: `🚨 PARTY ALERT! Marcus is turning 30! 🎂🔥

We're taking over the Skyline Penthouse for an unforgettable night of music, cocktails, and celebration.
🗓 Date: ${date}
⏰ Time: 7:00 PM
📍 Where: ${location}

Drop your RSVP and favorite hype track here so the DJ can spin it:
👉 https://celebra-tech.com/rsvp?event=${event.id}

Let's make this milestone legendary! 🚀🍾`,
        },
        toast: {
          badge: "Speech Framework",
          title: "Fun & Heartfelt Birthday Roast & Toast",
          tip: "Start with a lighthearted joke, then pivot into sincere appreciation.",
          text: `"Hey everyone! Tonight we are celebrating Marcus hitting the big 3-0! 
They say 30 is the age where your back starts making noises when you stand up, but Marcus has always been ahead of his time in that department!

All jokes aside, Marcus is the kind of friend who shows up when you need him, whether it's helping you move across town in the pouring rain or celebrating your wins like they're his own. 

Marcus, here's to leaving your twenties behind and stepping into your absolute best decade yet. Everyone raise your glasses to Marcus! Happy Birthday!"`,
        },
        social: {
          badge: "Photo Recap Captions",
          title: "Birthday Instagram Reel / Post Copy",
          tip: "Post a carousel with the cake blowout as slide 1 and candid dance photos next.",
          text: `Officially entered my thirties with the best crew on the planet! 🍾🎂✨ Thank you to everyone who made tonight unforgettable.

#ThirtyAndFlirty #DirtyThirty #MilestoneBirthday #GlowUp #GoodVibesOnly`,
        },
      };
    } else {
      return {
        formal: {
          badge: "Community Flyer & Announcement",
          title: "Official Community Festival Invitation",
          tip: "Emphasize free entry and accessibility features for families and seniors.",
          text: `CELEBRATING OUR NEIGHBORHOOD! 🎪🌻
THE ANNUAL HARVEST FESTIVAL & BLOCK PARTY

Saturday, October 31st, 2026
10:00 AM – 6:00 PM

${location}

Featuring:
• Live local music & cultural dance performances
• Gourmet Food Truck Row
• 50-foot collaborative chalk mural & kids activity village
• Local artisan craft pavilion

Free Admission • All Ages Welcome • Pet-Friendly!`,
        },
        whatsapp: {
          badge: "Community Group Broadcast",
          title: "Neighborhood Association Message",
          tip: "Encourage neighbors to walk or bicycle to reduce local parking congestion.",
          text: `📣 Neighbor Notice: Greenwood Harvest Festival is this Saturday! 🎪
Bring the family, enjoy live music, grab delicious food from 8 local food trucks, and let the kids explore the bouncy village and chalk murals!

📍 ${location}
⏰ 10 AM to 6 PM
🎟 Free entry for all residents!

Volunteer and schedule info: https://celebra-tech.com/community`,
        },
        toast: {
          badge: "Opening Speech",
          title: "Opening Welcome Address by Committee Chair",
          tip: "Acknowledge volunteer leads and municipal sponsors right at the kickoff.",
          text: `"Welcome neighbors, friends, and visitors! What makes our community extraordinary isn't the buildings or the streets — it's the people who care for one another. Today is about celebrating the bonds that connect us. Let's make today joyful, safe, and memorable!"`,
        },
        social: {
          badge: "Community Outreach",
          title: "Social Media Announcement",
          tip: "Tag local business sponsors and community leaders to expand reach.",
          text: `Community spirit was on full display today at the Harvest Festival! Over 350 neighbors came together to celebrate music, art, and local talent. 🌻🎪🎨

#OurCommunity #NeighborhoodPride #HarvestFestival #ShopLocal`,
        },
      };
    }
  },

  copyToClipboard(encoded) {
    const text = decodeURIComponent(encoded);
    navigator.clipboard.writeText(text).then(() => {
      App.showToast("Copied copy text to clipboard!");
    });
  },
};
