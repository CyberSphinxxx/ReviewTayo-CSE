(function(RT){
  RT.data = RT.data || {};
  RT.data.studyPlan = {
    items: [
      {
        id: 'daily',
        title: 'Daily Question',
        subtitle: 'One quick item to start the day & keep streak',
        duration: '1 min',
        icon: 'Q',
        action: 'qotd'
      },
      {
        id: 'smart',
        title: 'Smart Drill',
        subtitle: 'Adaptive mix · weak topics first',
        duration: '10 min',
        icon: '10',
        action: 'smart'
      },
      {
        id: 'reviewDue',
        title: 'Review Due',
        subtitle: '12 concepts ready · spaced review',
        duration: '6 min',
        icon: '↻',
        action: 'review-due'
      }
    ]
  };
})(window.ReviewTayo);
