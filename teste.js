class Category {
    static rows = [
      {
        id: 1,
        name: 'Meals & Foodstuffs',
        keywords: 'meals, food, groceries, snacks',
        slug: 'food',
        qualified: true
      },
      {
        id: 2,
        name: 'Textbooks & Supplies',
        keywords: 'textbooks, school supplies, office supplies, room decorations, educational materials',
        slug: 'supplies',
        qualified: true
      },
      {
        id: 3,
        name: 'Room & Board',
        keywords: 'rent, utilities',
        slug: 'rent',
        qualified: true
      },
      {
        id: 4,
        name: 'Transportation',
        keywords: 'transportation, public transit, airfare, rideshare',
        slug: 'transportation',
        qualified: false
      },
      {
        id: 999,
        name: 'Other',
        keywords: 'all other expenses',
        slug: 'other',
        qualified: false
      }
    ];
  
    static all() {
      return this.rows;
    }
  }
  
  // Using the Category class to get all categories and map them
  const categoriesString = Category.all()
    .map(category => `${category.slug}: ${category.keywords}`)
    .join("; ");
  
  console.log(categoriesString);
  