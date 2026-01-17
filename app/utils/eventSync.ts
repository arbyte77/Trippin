// Utility functions for syncing events from external APIs
// This is a template - add your API keys and customize as needed

interface ExternalEvent {
  name: string;
  category: string;
  date: string;
  location: {
    venue?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  description: string;
  price?: string;
  imageUrl?: string;
  ticketLink?: string;
  source: string;
}

/**
 * Map external category names to our internal categories
 */
export function mapCategoryToInternal(externalCategory: string, source: string): string {
  const categoryMap: { [key: string]: { [key: string]: string } } = {
    // Insider.in / BookMyShow mappings
    insider: {
      "comedy": "comedy_show",
      "standup-comedy": "comedy_show",
      "music": "music_concert",
      "concert": "music_concert",
      "workshop": "workshop",
      "food": "food_popup",
      "festival": "festival",
      "nightlife": "nightlife",
      "party": "nightlife",
      "theater": "theater",
      "theatre": "theater",
      "sports": "sports",
      "wellness": "wellness",
      "yoga": "wellness",
      "art": "art_exhibition",
      "exhibition": "art_exhibition",
    },
    
    // Eventbrite mappings
    eventbrite: {
      "Music": "music_concert",
      "Food & Drink": "food_popup",
      "Nightlife": "nightlife",
      "Performing & Visual Arts": "art_exhibition",
      "Business": "conference",
      "Health": "wellness",
      "Sports & Fitness": "sports",
      "Community": "festival",
    },
    
    // Facebook Events mappings
    facebook: {
      "MUSIC_EVENT": "music_concert",
      "ARTS_EVENT": "art_exhibition",
      "SPORTS_EVENT": "sports",
      "NIGHTLIFE": "nightlife",
      "FOOD_EVENT": "food_popup",
    }
  };

  const sourceMap = categoryMap[source.toLowerCase()] || {};
  return sourceMap[externalCategory] || "other";
}

/**
 * Fetch events from Insider.in (India's leading event platform)
 * Get API key from: https://insider.in/api
 */
export async function fetchInsiderEvents(location: string = "goa"): Promise<ExternalEvent[]> {
  const API_KEY = process.env.INSIDER_API_KEY;
  if (!API_KEY) {
    console.warn("INSIDER_API_KEY not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.insider.in/partner/events?location=${location}&status=upcoming`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Insider API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.events || []).map((event: any) => ({
      name: event.name,
      category: mapCategoryToInternal(event.category, "insider"),
      date: event.start_date,
      location: {
        venue: event.venue?.name,
        address: event.venue?.address,
        lat: event.venue?.latitude,
        lng: event.venue?.longitude,
      },
      description: event.description || event.brief_description,
      price: event.is_free ? "Free" : `₹${event.min_price}${event.max_price ? `-₹${event.max_price}` : ""}`,
      imageUrl: event.cover_image?.url,
      ticketLink: event.booking_url,
      source: "insider",
    }));
  } catch (error) {
    console.error("Error fetching Insider events:", error);
    return [];
  }
}

/**
 * Fetch events from Eventbrite
 * Get API key from: https://www.eventbrite.com/platform/api
 */
export async function fetchEventbriteEvents(location: string = "Goa, India"): Promise<ExternalEvent[]> {
  const API_KEY = process.env.EVENTBRITE_API_KEY;
  if (!API_KEY) {
    console.warn("EVENTBRITE_API_KEY not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.address=${encodeURIComponent(location)}&expand=venue`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Eventbrite API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.events || []).map((event: any) => ({
      name: event.name.text,
      category: mapCategoryToInternal(event.category?.name || "other", "eventbrite"),
      date: event.start.local,
      location: {
        venue: event.venue?.name,
        address: event.venue?.address?.localized_address_display,
        lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : undefined,
        lng: event.venue?.longitude ? parseFloat(event.venue.longitude) : undefined,
      },
      description: event.description?.text || event.summary,
      price: event.is_free ? "Free" : undefined,
      imageUrl: event.logo?.url,
      ticketLink: event.url,
      source: "eventbrite",
    }));
  } catch (error) {
    console.error("Error fetching Eventbrite events:", error);
    return [];
  }
}

/**
 * Fetch events from Facebook Graph API
 * Get access token from: https://developers.facebook.com/
 */
export async function fetchFacebookEvents(pageId: string): Promise<ExternalEvent[]> {
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    console.warn("FACEBOOK_ACCESS_TOKEN not configured");
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/events?access_token=${ACCESS_TOKEN}&fields=name,description,start_time,end_time,place,cover,ticket_uri,category`,
    );

    if (!response.ok) {
      console.error("Facebook API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.data || []).map((event: any) => ({
      name: event.name,
      category: mapCategoryToInternal(event.category || "other", "facebook"),
      date: event.start_time,
      location: {
        venue: event.place?.name,
        address: event.place?.location?.street,
        lat: event.place?.location?.latitude,
        lng: event.place?.location?.longitude,
      },
      description: event.description,
      imageUrl: event.cover?.source,
      ticketLink: event.ticket_uri,
      source: "facebook",
    }));
  } catch (error) {
    console.error("Error fetching Facebook events:", error);
    return [];
  }
}

/**
 * Web scraping fallback for popular Goa event websites
 * (Use only if APIs not available - be mindful of terms of service)
 */
export async function scrapeGoaEvents(): Promise<ExternalEvent[]> {
  // Example: Scrape from popular Goa event listing sites
  // You would use Cheerio or Puppeteer for this
  
  console.warn("Web scraping not implemented - use APIs when possible");
  return [];
  
  /* Example implementation with Cheerio:
  
  const response = await fetch('https://example-goa-events.com/listings');
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const events: ExternalEvent[] = [];
  $('.event-item').each((i, el) => {
    events.push({
      name: $(el).find('.event-name').text(),
      category: 'other',
      date: $(el).find('.event-date').text(),
      location: { venue: $(el).find('.event-venue').text() },
      description: $(el).find('.event-description').text(),
      source: 'scraped'
    });
  });
  
  return events;
  */
}

/**
 * Aggregate events from all sources
 */
export async function aggregateEvents(): Promise<ExternalEvent[]> {
  console.log("Fetching events from external sources...");
  
  const [insiderEvents, eventbriteEvents] = await Promise.all([
    fetchInsiderEvents("goa"),
    fetchEventbriteEvents("Goa, India"),
    // Add more sources as needed
  ]);

  const allEvents = [
    ...insiderEvents,
    ...eventbriteEvents,
  ];

  // Remove duplicates (by name and date)
  const uniqueEvents = allEvents.filter((event, index, self) => 
    index === self.findIndex((e) => 
      e.name === event.name && e.date === event.date
    )
  );

  console.log(`Aggregated ${uniqueEvents.length} unique events from ${allEvents.length} total`);
  return uniqueEvents;
}

/**
 * Extract area from address
 */
export function extractAreaFromAddress(address: string): string {
  const goaAreas = [
    "Panjim", "Panaji", "Candolim", "Calangute", "Baga", "Anjuna", "Vagator",
    "Mapusa", "Margao", "Colva", "Benaulim", "Palolem", "Agonda", "Arambol",
    "Morjim", "Ashwem", "Vasco", "Ponda", "Old Goa", "Loutolim", "Cavelossim",
    "Arpora", "Assagao",
  ];

  for (const area of goaAreas) {
    if (address.toLowerCase().includes(area.toLowerCase())) {
      return area;
    }
  }

  return "Goa";
}

/**
 * Get Indian holidays and special dates
 */
export function getUpcomingHolidays(): Array<{ name: string; date: Date; type: string }> {
  const now = new Date();
  const year = now.getFullYear();
  
  // Note: Some dates vary by year (lunar calendar), update annually
  const holidays = [
    { name: "Republic Day", date: new Date(year, 0, 26), type: "national" },
    { name: "Holi", date: new Date(year, 2, 25), type: "festival" }, // Varies
    { name: "Good Friday", date: new Date(year, 3, 18), type: "religious" }, // Varies
    { name: "Independence Day", date: new Date(year, 7, 15), type: "national" },
    { name: "Ganesh Chaturthi", date: new Date(year, 8, 19), type: "festival" }, // Varies
    { name: "Diwali", date: new Date(year, 10, 1), type: "festival" }, // Varies
    { name: "Christmas", date: new Date(year, 11, 25), type: "religious" },
    { name: "New Year's Eve", date: new Date(year, 11, 31), type: "celebration" },
  ];

  return holidays.filter(h => h.date >= now);
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date): boolean {
  const holidays = getUpcomingHolidays();
  return holidays.some(h => 
    h.date.toDateString() === date.toDateString()
  );
}

/**
 * Get next weekend dates
 */
export function getNextWeekendDates(): { friday: Date; saturday: Date; sunday: Date } {
  const now = new Date();
  const today = now.getDay();
  const daysUntilFriday = (5 - today + 7) % 7;
  
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  
  return { friday, saturday, sunday };
}

/**
 * Format price string consistently
 */
export function formatPrice(price: number | string | undefined, isFree?: boolean): string {
  if (isFree) return "Free";
  if (!price) return "$$";
  
  if (typeof price === "number") {
    return `₹${price}`;
  }
  
  return price;
}

/**
 * Validate event data before saving
 */
export function validateEventData(event: Partial<ExternalEvent>): boolean {
  if (!event.name || event.name.length < 3) {
    console.error("Event name too short");
    return false;
  }
  
  if (!event.date) {
    console.error("Event date missing");
    return false;
  }
  
  const eventDate = new Date(event.date);
  if (isNaN(eventDate.getTime()) || eventDate < new Date()) {
    console.error("Invalid or past event date");
    return false;
  }
  
  return true;
}
