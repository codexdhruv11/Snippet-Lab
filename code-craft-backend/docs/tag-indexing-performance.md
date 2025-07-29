# Tag Indexing Performance Considerations

## Overview

The tagging system uses MongoDB array indexes and compound indexes to optimize query performance. While these indexes improve read performance, they have implications for write performance and storage.

## Current Index Strategy

### Indexes on the Snippet Collection

```javascript
// Single field index on tags
snippetSchema.index({ tags: 1, createdAt: -1 });

// Compound index for language + tag filtering
snippetSchema.index({ programmingLanguage: 1, tags: 1, createdAt: -1 });
```

## Performance Implications

### Write Performance

1. **Index Update Overhead**: Each insert/update that modifies tags requires updating multiple indexes
2. **Array Index Cost**: MongoDB creates index entries for each array element, so a snippet with 5 tags creates 5 index entries
3. **Memory Usage**: More index entries mean more RAM usage for the index

### Read Performance

1. **Efficient Tag Queries**: Queries filtering by tags benefit from the indexes
2. **Compound Index Benefits**: The compound index serves queries that filter by both language and tags
3. **Sort Performance**: Including `createdAt` in indexes eliminates the need for in-memory sorting

## Optimization Strategies

### 1. Monitor Index Usage

```javascript
// Check index usage statistics
db.snippets.aggregate([
  { $indexStats: {} }
]);

// Check index sizes
db.snippets.stats().indexSizes;
```

### 2. Consider Partial Indexes

For better performance with sparse tag data:

```javascript
// Only index documents that have tags
snippetSchema.index(
  { tags: 1, createdAt: -1 },
  { 
    partialFilterExpression: { 
      tags: { $exists: true, $ne: [] } 
    } 
  }
);
```

### 3. Tag Normalization Benefits

The tag normalization system reduces index size by:
- Converting to lowercase (reduces duplicates)
- Removing special characters
- Limiting tag length
- Deduplicating tags per snippet

### 4. Popular Tags Aggregation

The `getPopularTags` aggregation uses `allowDiskUse(true)` to handle large datasets:

```javascript
.aggregate([...]).allowDiskUse(true)
```

This prevents memory limit errors but may use temporary disk files for large operations.

## Recommendations

### For Small to Medium Deployments (< 100K snippets)
- Current indexing strategy is optimal
- Monitor index sizes regularly
- Use caching for popular tags to reduce aggregation load

### For Large Deployments (> 100K snippets)
1. Consider sharding by user or date
2. Implement tag collection for faster popular tag queries
3. Use partial indexes to reduce index size
4. Consider dedicated read replicas for tag aggregations

### Index Maintenance
- Run `db.snippets.reIndex()` during low-traffic periods if performance degrades
- Monitor the `indexSize` vs `dataSize` ratio
- Consider dropping unused indexes based on `$indexStats`

## Cache Strategy

The popular tags cache helps reduce aggregation load:
- TTL: 1 hour (configurable)
- Invalidation: On snippet create/update with tags
- Multiple cache keys for different limits (10, 20, 50)

## Future Optimizations

1. **Dedicated Tags Collection**: For very large deployments, maintain a separate collection with tag counts
2. **Tag Limits**: The current limit of 10 tags per snippet helps control index size
3. **Background Aggregation**: Run popular tag calculations as a scheduled job rather than on-demand
