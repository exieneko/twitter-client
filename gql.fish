#!/usr/bin/env fish
# run this script with a path to the directory with a dump of the twitter javascript bundle in it
# requires fish and jq

argparse 'q/quiet' -- $argv

if not set -q argv[1]
    'missing --dir'
end

set -l endpoints
set -l flags

for file in (find $argv[1] -type f -iname '*.js')
    if not set -q _flag_quiet
        echo $file
    end

    set -l content (cat $file | string match -rga -- 'queryId:"(.*?)",.*?operationName:"(.*?)",.*?operationType:"(.*?)",.*?featureSwitches:(\[.*?\])')
    set -l groups 4

    for index in (seq 1 $groups (count $content))
        printf '%s\n' $content | tail -n (math "$(count $content) + 1 - $index") | head -n $groups | read -lL query_id name type features

        set -a -- endpoints (jq -cn --arg id "$query_id/$name" --arg type $type --argjson features $features '{id: $id, type: $type, features: $features}')
        set -a -- flags (printf '%s\n' $features | jq '.[]')
    end
end

printf '%s\n' $endpoints | jq -rs 'unique_by(.id) | sort_by(.id | split("/")[-1] | ascii_upcase) | .' > endpoints.jsonc
printf '%s\n' $flags | jq -rs 'unique | .' > flags.jsonc
