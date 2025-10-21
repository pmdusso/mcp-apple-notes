export const mockNotes = {
  simple: {
    title: 'Simple Note',
    content: 'Simple content',
    expectedId: 'note123'
  },
  withLineBreaks: {
    title: 'Multi-line Note',
    content: 'Line 1\nLine 2\nLine 3',
    expectedHTML: 'Line 1<br>Line 2<br>Line 3'
  },
  withHTML: {
    title: 'HTML Note',
    content: '<script>alert("xss")</script>',
    expectedSanitized: '&lt;script&gt;alert(\\"xss\\")&lt;/script&gt;'
  },
  withList: {
    title: 'List Note',
    content: '• Item 1\n• Item 2',
    expectedHTML: '<ul><li>Item 1</li><li>Item 2</li></ul>'
  }
};
