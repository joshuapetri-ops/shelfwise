/** Mock social data for the Social and Onboarding pages */

export const mockUsers = [
  { handle: 'alice.bsky.social', name: 'Alice Chen', avatar: null, mutuals: 12, bio: 'Sci-fi and literary fiction lover' },
  { handle: 'bob.reads.social', name: 'Bob Martinez', avatar: null, mutuals: 8, bio: 'History and biography enthusiast' },
  { handle: 'carol.books.social', name: 'Carol Wright', avatar: null, mutuals: 5, bio: 'Fantasy and romance reader' },
  { handle: 'dan.lit.social', name: 'Dan Okafor', avatar: null, mutuals: 3, bio: 'Non-fiction and philosophy' },
  { handle: 'emma.shelf.social', name: 'Emma Park', avatar: null, mutuals: 15, bio: 'Cozy mysteries and thrillers' },
  { handle: 'frank.pages.social', name: 'Frank Silva', avatar: null, mutuals: 7, bio: 'Classic literature and poetry' },
]

export const mockActivity = [
  { user: mockUsers[0], action: 'started reading', book: { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', coverId: 8814602 }, timestamp: '2h ago' },
  { user: mockUsers[1], action: 'finished', book: { title: 'Say Nothing', author: 'Patrick Radden Keefe', coverId: 10413286 }, timestamp: '4h ago' },
  { user: mockUsers[2], action: 'wants to read', book: { title: 'House of Salt and Sorrows', author: 'Erin A. Craig', coverId: 10149671 }, timestamp: '6h ago' },
  { user: mockUsers[4], action: 'rated 5 stars', book: { title: 'The Thursday Murder Club', author: 'Richard Osman', coverId: 10559951 }, timestamp: '8h ago' },
  { user: mockUsers[3], action: 'started reading', book: { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', coverId: 7360721 }, timestamp: '12h ago' },
  { user: mockUsers[5], action: 'finished', book: { title: 'Middlemarch', author: 'George Eliot', coverId: 8234196 }, timestamp: '1d ago' },
  { user: mockUsers[0], action: 'wants to read', book: { title: 'Project Hail Mary', author: 'Andy Weir', coverId: 10743576 }, timestamp: '1d ago' },
  { user: mockUsers[2], action: 'rated 4 stars', book: { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', coverId: 8477219 }, timestamp: '2d ago' },
]

export const mockLibraries = [
  { code: 'nypl', name: 'New York Public Library', city: 'New York, NY' },
  { code: 'lapl', name: 'Los Angeles Public Library', city: 'Los Angeles, CA' },
  { code: 'chipublib', name: 'Chicago Public Library', city: 'Chicago, IL' },
  { code: 'sfpl', name: 'San Francisco Public Library', city: 'San Francisco, CA' },
  { code: 'spl', name: 'Seattle Public Library', city: 'Seattle, WA' },
  { code: 'bpl', name: 'Boston Public Library', city: 'Boston, MA' },
  { code: 'multcolib', name: 'Multnomah County Library', city: 'Portland, OR' },
  { code: 'dcpl', name: 'DC Public Library', city: 'Washington, DC' },
  { code: 'austinpl', name: 'Austin Public Library', city: 'Austin, TX' },
  { code: 'denverlibrary', name: 'Denver Public Library', city: 'Denver, CO' },
  { code: 'kcpl', name: 'Kansas City Public Library', city: 'Kansas City, MO' },
  { code: 'nashvillepl', name: 'Nashville Public Library', city: 'Nashville, TN' },
  { code: 'philly', name: 'Free Library of Philadelphia', city: 'Philadelphia, PA' },
  { code: 'aacpl', name: 'Anne Arundel County Library', city: 'Annapolis, MD' },
  { code: 'mcpl', name: 'Montgomery County Public Libraries', city: 'Rockville, MD' },
]

export const criteriaTemplates = [
  {
    name: 'Fiction Standard',
    criteria: [
      { id: 'plot', name: 'Plot', emoji: '📖', max: 5, type: 'stars' },
      { id: 'characters', name: 'Characters', emoji: '🧑', max: 5, type: 'stars' },
      { id: 'writing', name: 'Writing Style', emoji: '✍️', max: 5, type: 'stars' },
      { id: 'worldbuilding', name: 'World Building', emoji: '🌍', max: 5, type: 'stars' },
      { id: 'enjoyment', name: 'Enjoyment', emoji: '😊', max: 10, type: 'slider' },
    ],
  },
  {
    name: 'Non-Fiction',
    criteria: [
      { id: 'insight', name: 'Insight', emoji: '💡', max: 5, type: 'stars' },
      { id: 'research', name: 'Research Quality', emoji: '🔬', max: 5, type: 'stars' },
      { id: 'readability', name: 'Readability', emoji: '📝', max: 5, type: 'stars' },
      { id: 'actionable', name: 'Actionability', emoji: '🎯', max: 10, type: 'slider' },
    ],
  },
  {
    name: 'Romance',
    criteria: [
      { id: 'chemistry', name: 'Chemistry', emoji: '🔥', max: 5, type: 'stars' },
      { id: 'characters', name: 'Characters', emoji: '🧑', max: 5, type: 'stars' },
      { id: 'spice', name: 'Spice Level', emoji: '🌶️', max: 5, type: 'stars' },
      { id: 'feels', name: 'Emotional Impact', emoji: '💕', max: 10, type: 'slider' },
    ],
  },
  {
    name: 'Minimalist',
    criteria: [
      { id: 'overall', name: 'Overall', emoji: '⭐', max: 5, type: 'stars' },
      { id: 'wouldRecommend', name: 'Would Recommend', emoji: '👍', max: 10, type: 'slider' },
    ],
  },
]
